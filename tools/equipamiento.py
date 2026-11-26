"""StrataFit · iconos del equipamiento. Copia a la app los iconos del catálogo de equipamiento del propietario
(StrataFit_Equipamiento: catalogo.json e icons/, 62 PNG transparentes de 192 × 120) que usa «Equipamiento» en el Overview:

  python3 tools/equipamiento.py ruta/a/la/carpeta/del/paquete

Escribe src/img/equipment/<icono>.webp, sin pérdida (los píxeles son los del PNG; pesan la mitad), solo de los iconos que
nombra src/js/data/equipment.js y no son de los dibujados en vectorial (.svg, que van ya en esa carpeta). Un icono de la app
con otro nombre que el del catálogo (la polea es el de la máquina DAP…) sale de su PNG según SOURCES. Avisa de lo que sobre en
la carpeta. El paquete no hace falta en el repositorio.
Requiere Pillow.
"""
import json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'img', 'equipment')
DATA = os.path.join(ROOT, 'src', 'js', 'data', 'equipment.js')
SIZE = (192, 120)
# los iconos de la app que son el de otro material del catálogo
SOURCES = {
    'cable': 'dap-machine',
    'chest-press': 'chest-press-plate-loaded',
    'incline-chest-press': 'incline-chest-press-plate-loaded',
    'decline-chest-press': 'decline-chest-press-plate-loaded',
    'assisted-machine': 'dip-machine',
}


def icons_used():
    """Los iconos que nombra data/equipment.js (el segundo texto de cada material: «'id': ['Nombre', 'icono']»)."""
    src = open(DATA, encoding='utf-8').read()
    return sorted(set(re.findall(r"'[\w-]+': \['[^']+', '([\w-]+)'\]", src)))


def main(pack):
    cat = json.load(open(os.path.join(pack, 'catalogo.json'), encoding='utf-8'))
    files = {it['id']: os.path.join(pack, it['icon']) for it in cat['items'] if it.get('kind') == 'equipment'}
    os.makedirs(OUT, exist_ok=True)
    done, drawn = [], []
    for name in icons_used():
        if os.path.isfile(os.path.join(OUT, name + '.svg')):
            drawn.append(name)
            continue
        src = files.get(SOURCES.get(name, name))
        if not src:
            sys.exit('%s no está en el catálogo ni dibujado (src/img/equipment/%s.svg)' % (name, name))
        im = Image.open(src)
        if im.size != SIZE or im.mode != 'RGBA':
            sys.exit('%s: %s %s, se esperaba RGBA de %d × %d' % (src, im.mode, im.size, *SIZE))
        out = os.path.join(OUT, name + '.webp')
        im.save(out, 'WEBP', lossless=True, exact=True, quality=100, method=6)
        if Image.open(out).convert('RGBA').tobytes() != im.tobytes():
            sys.exit('%s: el WebP no es igual que el PNG' % out)
        done.append(name)
    keep = set(icons_used())
    for f in sorted(os.listdir(OUT)):
        if os.path.splitext(f)[0] not in keep:
            print('  aviso: src/img/equipment/%s no lo usa la app' % f)
    size = sum(os.path.getsize(os.path.join(OUT, n + '.webp')) for n in done)
    print('src/img/equipment: %d iconos del catálogo en WebP (%.0f KB) y %d dibujados' % (len(done), size / 1024, len(drawn)))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
