"""StrataFit · imágenes de las tarjetas de la librería. Copia a la app las del paquete del rediseño de la librería que aprobó el
propietario (StrataFit_Catalogo: catalogo.json, assets/ilustraciones y assets/iconos):

  python3 tools/catalogo.py ruta/a/la/carpeta/del/paquete
  python3 tools/catalogo.py --iconos      (solo completa los iconos cortados de src/img/catalog: ICON_MIRROR)

Escribe en src/img/catalog, por cada grupo que nombra src/js/data/catalog.js:
- <id>.webp: su ilustración (el modelo anatómico gris con sus músculos en rojo y naranja; el kettlebell, el trineo, el cajón o
  la air bike), con su tamaño y su transparencia, en WebP con pérdida de calidad 90. El paquete la trae sin pérdida (732 KB las
  14): así pesan seis veces menos (unos 120 KB) y no se nota (unos 40 dB sobre los píxeles que se ven; las esquinas
  transparentes, iguales). Son recortes de una composición, no fotos originales: no se agrandan.
- <id>-icono.webp: su icono rojo, sin pérdida, centrado en un lienzo transparente de su ancho y del alto del más alto
  (ICON_H): con una sola altura en el CSS, todos salen a la misma escala, como en la referencia, y cada uno con su ancho. En
  la app hace de máscara: su color es el de la app (library/catalog), no el rojo del archivo.
Retoques que pidió el propietario (RETOUCH), antes de comprimir: en la de CrossFit se quita la marca «ROGUE» del poste del rack.
Dos iconos del paquete llegan cortados por un lado, el de Isquios y glúteos por la izquierda (el propietario: «la imagen de
glúteo sale algo cortada») y el de Pecho, la mancuerna, por la derecha: se completan reflejando su lado bueno (ICON_MIRROR).
Como el paquete no está en el repositorio, `python3 tools/catalogo.py --iconos` lo hace sobre los iconos de src/img/catalog que
aún estén cortados.
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

# iconos cortados por un lado: id → (lado que falta, eje de simetría, ancho con que llega en el paquete). El eje va en el centro
# de las columnas de píxeles (18.5 es entre la 18 y la 19): el de la raya del medio en el de glúteos y el de la barra en la
# mancuerna, medidos en sus píxeles (las dos mitades que se ven enteras, y la raya, quedan iguales a sí mismas)
ICON_MIRROR = {'hamstrings_glutes': ('izquierda', 18.5, 54), 'chest': ('derecha', 29.5, 53)}


def completa(ico, lado, eje):
    """El icono con el lado que falta rehecho como reflejo del otro alrededor de `eje`, en un lienzo que llega justo hasta
    donde llega el dibujo. Antes quita las motas (grupos de menos de 6 píxeles sueltos, como los dos casi transparentes de la
    esquina del de glúteos), que el reflejo duplicaría y que ensancharían el lienzo."""
    w, h = ico.size
    px = ico.load()
    visto = set()
    for y0 in range(h):
        for x0 in range(w):
            if (x0, y0) in visto or not px[x0, y0][3]:
                continue
            grupo, pila = [], [(x0, y0)]
            visto.add((x0, y0))
            while pila:
                x, y = pila.pop()
                grupo.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        q = (x + dx, y + dy)
                        if 0 <= q[0] < w and 0 <= q[1] < h and q not in visto and px[q][3]:
                            visto.add(q)
                            pila.append(q)
            if len(grupo) < 6:
                for q in grupo:
                    px[q] = (0, 0, 0, 0)
    cols = [x for x in range(w) if any(px[x, y][3] for y in range(h))]
    e2 = round(eje * 2)
    if lado == 'izquierda':
        x0, x1 = e2 - cols[-1], cols[-1]
    else:
        x0, x1 = cols[0], e2 - cols[0]
    out = Image.new('RGBA', (x1 - x0 + 1, h), (0, 0, 0, 0))
    po = out.load()
    for X in range(out.width):
        i = X + x0
        refleja = 2 * i < e2 if lado == 'izquierda' else 2 * i > e2
        j = e2 - i if refleja else i
        if 0 <= j < w:
            for y in range(h):
                po[X, y] = px[j, y]
    return out


def cortado(ico, lado):
    """¿Llega el dibujo al borde de ese lado con un trazo entero (casi opaco)? Así queda un icono cortado; uno completo acaba
    en ese borde con el filo suavizado del trazo."""
    x = 0 if lado == 'izquierda' else ico.width - 1
    return max(ico.getpixel((x, y))[3] for y in range(ico.height)) >= 200


def iconos():
    """Completa en src/img/catalog los iconos de ICON_MIRROR que sigan cortados (los demás ya lo están)."""
    want = catalog()
    for k, (lado, eje, ancho) in ICON_MIRROR.items():
        p = os.path.join(OUT, k + '-icono.webp')
        ico = Image.open(p).convert('RGBA')
        if not cortado(ico, lado):
            print('  %s: ya está completo (%d px de ancho)' % (k, ico.width))
            continue
        if ico.width != ancho:
            sys.exit('%s: el icono cortado mide %d de ancho, no %d: revisa su eje en ICON_MIRROR' % (k, ico.width, ancho))
        ico = completa(ico, lado, eje)
        if ico.width != want[k][2]:
            sys.exit('%s: completo mide %d de ancho; pon ese ancho en data/catalog.js' % (k, ico.width))
        ico.save(p, 'WEBP', lossless=True, exact=True, quality=100, method=6)
        print('  %s: completado (%d px de ancho)' % (k, ico.width))


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
        if k in RETOUCH:
            art = RETOUCH[k](art)
        ref = cat[k]['artworkSize']
        if art.size != (w, h) or art.size != (ref['width'], ref['height']):
            sys.exit('%s: la ilustración mide %s; data/catalog.js dice %s y catalogo.json %s' % (k, art.size, (w, h), ref))
        p = os.path.join(OUT, k + '.webp')
        art.save(p, 'WEBP', quality=QUALITY, alpha_quality=100, method=6)
        size += os.path.getsize(p)
        ico = Image.open(os.path.join(pack, cat[k]['icon'])).convert('RGBA')
        if k in ICON_MIRROR:
            lado, eje, ancho = ICON_MIRROR[k]
            if ico.width != ancho:
                sys.exit('%s: el icono del paquete mide %d de ancho, no %d: revisa su eje en ICON_MIRROR' % (k, ico.width, ancho))
            ico = completa(ico, lado, eje)
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
    iconos() if sys.argv[1] == '--iconos' else main(sys.argv[1])
