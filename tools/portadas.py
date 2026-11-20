"""StrataFit · portadas de los días hechas con las imágenes del propietario (hechas con Gemini: ni los sitios ni la gente son
reales). Recorta cada celda de sus cuadrículas, la pasa a gris, la encuadra a 1,6:1 y la guarda en WebP:

  python3 tools/portadas.py --mujer-fuerza A.jpg --mujer-hyrox B.jpg --hombre-hyrox C.jpg --hombre-descanso D.jpg \
                            --mujer-brazos E.png

Cada cuadrícula (1438 × 2576) tiene dos columnas y cuatro filas de fotos con su título encima; el orden de las celdas, por
filas, es el de CELLS. Salen src/img/day/<clave>.webp (hombre) y src/img/day/mujer/<clave>.webp (mujer); data/photos dice qué
día lleva cada una. La celda «Programa y app» de la cuadrícula de fuerza de mujer no se usa (no tiene pareja en las de hombre);
la de brazos de mujer es una foto suelta (el tríceps en polea).
Las más claras (la calle, el trineo, los wall balls) se oscurecen hasta el tono de las demás, para que el texto blanco de la
tarjeta del día se lea encima (tests/covers.py lo mide).
Requiere Pillow y numpy.
"""
import argparse, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAY = os.path.join(ROOT, 'src', 'img', 'day')
W, H = 704, 440          # 1,6:1: la tarjeta del día (unos 1,8:1) recorta poco, y los recuadros de las rutinas, por los lados
QUALITY = 75
MAX_MEAN = 85            # brillo medio máximo (0-255): el de la portada más clara de las primeras (descanso, 84)
MAX_TOP = 105            # y en el tercio de arriba, donde va el nombre del día (el de descanso, 103)
# las filas y columnas de fotos de las cuadrículas (sin los títulos ni la separación del centro)
ROWS = [(245, 673), (781, 1214), (1323, 1803), (1914, 2576)]
COLS = [(0, 713), (724, 1438)]
# clave de cada celda, por filas, y su encuadre: (foco vertical, foco horizontal), de 0 (arriba, izquierda) a 1
CELLS = {
    'mujer-fuerza': [('pecho', .5), ('hombros', .5), ('torso', .5), ('espalda', .5), ('piernas', .5), ('legs', .5),
                     (None, 0), ('descanso', .05)],
    'mujer-hyrox': [('skierg', .5), ('trineo', .5), ('wallballs', .5), ('snatch', .5), ('thrusters', 0), ('boxjumps', .2),
                    ('granjero', .05), ('descanso2', .37)],
    'hombre-hyrox': [('skierg', .5), ('trineo', .5), ('wallballs', .5), ('snatch', .5), ('thrusters', 0), ('boxjumps', .2),
                     ('granjero', .05), ('competencia', .18)],
}
# la foto suelta del descanso de hombre (vertical, 1792 × 2400): de la cabeza a las rodillas, con el cajón y la bolsa
REST_BOX = (0, 600, 1792, 1720)
# la de brazos de mujer (vertical, 1086 × 1448): desde la cara, a todo lo ancho, hasta pasado el codo (el tríceps, lo principal)
ARMS_TOP = 140


def frame(im, fy):
    """El mayor recorte de 1,6:1, centrado a lo ancho y a la altura que diga fy."""
    w, h = im.size
    ch = min(h, round(w / 1.6))
    cw = min(w, round(ch * 1.6))
    x = (w - cw) // 2
    y = round((h - ch) * fy)
    return im.crop((x, y, x + cw, y + ch))


KNEE = 80               # por debajo de este gris nada cambia: la persona y las sombras quedan como estaban


def tone(im):
    """Si la foto es más clara que MAX_MEAN de media o que MAX_TOP en su tercio de arriba, baja sus claros (una pared blanca, el
    cielo): lo que pasa de KNEE se comprime lo justo. Las sombras y los medios tonos no cambian."""
    a = np.asarray(im).astype(float)
    curve = lambda x, s: np.where(x > KNEE, KNEE + (x - KNEE) * s, x)

    def slope(x, limit):
        if x.mean() <= limit:
            return 1.0
        lo, hi = 0.0, 1.0
        for _ in range(30):
            s = (lo + hi) / 2
            lo, hi = (s, hi) if curve(x, s).mean() <= limit else (lo, s)
        return lo
    s = min(slope(a, MAX_MEAN), slope(a[: a.shape[0] // 3], MAX_TOP))
    return im if s == 1.0 else Image.fromarray(np.uint8(np.clip(curve(a, s) + .5, 0, 255)))


def save(im, path):
    im = tone(im.resize((W, H), Image.LANCZOS))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=QUALITY, method=6)
    print('  %s  %d KB' % (os.path.relpath(path, ROOT), os.path.getsize(path) // 1024))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    for k in list(CELLS) + ['hombre-descanso', 'mujer-brazos']:
        ap.add_argument('--' + k, required=True)
    args = vars(ap.parse_args())
    for grid, cells in CELLS.items():
        im = Image.open(args[grid.replace('-', '_')]).convert('L')
        if im.size != (1438, 2576):
            raise SystemExit('%s: la cuadrícula tiene que medir 1438 × 2576 (mide %d × %d)' % (grid, *im.size))
        out = os.path.join(DAY, 'mujer') if grid.startswith('mujer') else DAY
        cut = [im.crop((x0, y0, x1, y1)) for (y0, y1) in ROWS for (x0, x1) in COLS]
        for (key, fy), cell in zip(cells, cut):
            if key:
                save(frame(cell, fy), os.path.join(out, key + '.webp'))
    im = Image.open(args['hombre_descanso']).convert('L')
    save(im.crop(REST_BOX), os.path.join(DAY, 'descanso2.webp'))
    im = Image.open(args['mujer_brazos']).convert('L')
    save(im.crop((0, ARMS_TOP, im.width, ARMS_TOP + round(im.width / 1.6))), os.path.join(DAY, 'mujer', 'brazos.webp'))


if __name__ == '__main__':
    main()
