"""StrataFit · fondo del inicio de sesión (F-33, T-18). Prepara, desde una foto, la imagen que va detrás del inicio de sesión:

  python3 tools/fondo.py ruta/a/la/foto.jpg

La foto es vertical (un gimnasio visto desde arriba). Sale src/img/login/fondo.webp: en gris, desenfocada y a 720 px de ancho.
El desenfoque va en el archivo, no en la app: así no hace falta un filtro que el móvil tenga que calcular en cada pintada y la
foto original, en la que se reconoce a quien sale, no llega al repositorio ni a la app. El oscurecido lo pone la app encima
(css/94-account: .lgw::before), para poder ajustarlo sin volver a preparar la imagen.
Requiere Pillow.
"""
import os, sys
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'img', 'login', 'fondo.webp')
WIDTH = 720      # ancho del archivo: con el desenfoque ya no hay detalle más fino que esto
BLUR = 4.5 / 1438  # radio del desenfoque, en proporción al ancho de la foto (4,5 px en una de 1438)
QUALITY = 72


def main(src):
    im = Image.open(src).convert('L')
    if im.width >= im.height:
        sys.exit('La foto tiene que ser vertical (%d × %d).' % im.size)
    im = im.filter(ImageFilter.GaussianBlur(BLUR * im.width))
    im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, 'WEBP', quality=QUALITY, method=6)
    print('%s  %d × %d, %.1f KB' % (os.path.relpath(OUT, ROOT), im.width, im.height, os.path.getsize(OUT) / 1024))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
