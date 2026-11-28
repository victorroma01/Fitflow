"""StrataFit · más fotos para las portadas de los días, para que no salgan siempre las mismas: las del paquete del propietario
(StrataFit_Tarjetas: fotos sueltas en blanco y negro, hechas con IA; ni los sitios ni la gente son reales), con su catalog.json:

  python3 tools/variantes.py carpeta-del-paquete [id…]

(con ids, solo esas fotos: las demás no se tocan)

Cada foto de VARIANTES es otra versión de una portada (su clave, la de src/img/day/order.txt): sale en src/img/day/<clave>-<n>.webp
(hombre) o en src/img/day/mujer/<clave>-<n>.webp (mujer), con n desde el 2 en el orden de la tabla (la 1 es la de siempre). Se
preparan como las de tools/portadas.py: el mayor recorte de 1,6:1 a la altura de su foco (el «object_position» del catálogo),
en gris, a 704 × 440, con los claros bajados si hace falta para que el texto blanco de la tarjeta se lea (tests/covers.py), en
WebP. Qué variante lleva cada día lo decide workout/images (una cada semana, sin repetir en la misma semana).
Cada foto va con la portada de lo que se ve en ella: el ejercicio de su grupo (un remo, en Espalda; una sentadilla de la
modelo, en Piernas; un peso muerto rumano, en Glúteo, la de «legs»), la carrera o el paseo en Cardio y el café o el desayuno
en casa en Descanso. Las de la modelo, solo con el perfil de mujer; las del modelo, con el de hombre. Se queda fuera la que el
catálogo no deja elegir sola («auto_select»: la tercera de la cinta, con la cara distinta): está en el paquete, pero no aquí.
Antes de prepararlas se borra lo que dice BORRAR: la marca HYROX de la pared, en la del trineo (es una marca registrada; lo pidió
el propietario). STRATAFIT, en la ropa y el trineo, se queda.
Requiere Pillow y numpy.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from portadas import DAY, frame, save  # noqa: E402

# id del catálogo → clave de la portada de la que es otra versión (por orden: el número de cada variante)
VARIANTES = [
    ('male_incline_dumbbell_press_01', 'pecho'),
    ('male_incline_dumbbell_press_02', 'pecho'),
    ('male_barbell_row_01', 'espalda'),
    ('male_barbell_row_02', 'espalda'),
    ('male_lat_pulldown_01', 'espalda'),
    ('male_seated_cable_row_01', 'espalda'),
    ('male_barbell_row_03', 'torso'),
    ('male_dumbbell_shoulder_press_01', 'hombros'),
    ('male_ez_bar_curl_01', 'brazos'),
    ('male_sled_push_01', 'trineo'),
    ('male_outdoor_run_01', 'cardio'),
    ('male_outdoor_run_02', 'cardio'),
    ('male_outdoor_walk_01', 'cardio'),
    ('male_coffee_at_home_01', 'descanso'),
    ('male_coffee_at_home_02', 'descanso'),
    ('male_coffee_at_home_03', 'descanso'),
    ('female_seated_cable_row_01', 'espalda'),
    ('female_barbell_row_01', 'espalda'),
    ('female_back_squat_01', 'piernas'),
    ('female_back_squat_02', 'piernas'),
    ('female_bulgarian_split_squat_01', 'piernas'),
    ('female_dumbbell_rdl_01', 'legs'),
    ('female_barbell_rdl_01', 'legs'),
    ('female_lateral_raise_01', 'hombros'),
    ('female_treadmill_run_01', 'cardio'),
    ('female_treadmill_run_02', 'cardio'),
    ('female_coffee_at_home_01', 'descanso'),
    ('female_coffee_at_home_02', 'descanso'),
    ('female_breakfast_at_home_01', 'descanso'),
]
# el foco de las verticales en el recorte de 1,6:1 (de 0, arriba, a 1, abajo), en vez del del catálogo, con el que se quedaban
# sin cabeza: el paseo, de la cabeza a la cadera; el remo en polea, de la gorra al codo; el remo y el peso muerto rumano de la
# modelo, con la cabeza, la espalda y la barra
FOCO = {'male_outdoor_walk_01': .08, 'male_seated_cable_row_01': .2, 'female_barbell_row_01': .02, 'female_barbell_rdl_01': .22}
# lo que se borra de una foto antes de prepararla, en píxeles de la del paquete (x0, y0, x1, y1): en la del trineo, la marca
# HYROX de la pared (va sobre la pared lisa: la caja no toca nada más)
BORRAR = {'male_sled_push_01': [(774, 268, 926, 316)]}


def borrar(im, cajas):
    """Tapa cada caja con la pared de alrededor: un relleno suave que casa con sus cuatro bordes (un parche de Coons, con la
    media de 3 px de cada lado) y el grano de la foto, medido en una franja de 12 px alrededor (siempre el mismo: semilla 0)."""
    a = np.asarray(im, dtype=float).copy()
    rng = np.random.default_rng(0)
    for x0, y0, x1, y1 in cajas:
        top, bot = a[y0 - 3:y0, x0:x1].mean(0), a[y1:y1 + 3, x0:x1].mean(0)
        lef, rig = a[y0:y1, x0 - 3:x0].mean(1), a[y0:y1, x1:x1 + 3].mean(1)
        c00, c10 = a[y0 - 3:y0, x0 - 3:x0].mean(), a[y0 - 3:y0, x1:x1 + 3].mean()
        c01, c11 = a[y1:y1 + 3, x0 - 3:x0].mean(), a[y1:y1 + 3, x1:x1 + 3].mean()
        U, V = np.meshgrid((np.arange(x1 - x0) + .5) / (x1 - x0), (np.arange(y1 - y0) + .5) / (y1 - y0))
        fill = ((1 - U) * lef[:, None] + U * rig[:, None] + (1 - V) * top[None, :] + V * bot[None, :]
                - ((1 - U) * (1 - V) * c00 + U * (1 - V) * c10 + (1 - U) * V * c01 + U * V * c11))
        ring = a[y0 - 12:y1 + 12, x0 - 12:x1 + 12]
        blur = np.asarray(Image.fromarray(ring.astype(np.uint8)).filter(ImageFilter.BoxBlur(2)), dtype=float)
        out = np.ones(ring.shape, bool)
        out[12:-12, 12:-12] = False
        a[y0:y1, x0:x1] = fill + rng.normal(0, (ring - blur)[out].std(), fill.shape)
    return Image.fromarray(np.clip(a.round(), 0, 255).astype(np.uint8))


def main(pack, only=()):
    if set(only) - {i for i, _ in VARIANTES}:
        sys.exit('no están en VARIANTES: %s' % ', '.join(sorted(set(only) - {i for i, _ in VARIANTES})))
    cat = {a['id']: a for a in json.load(open(os.path.join(pack, 'catalog.json'), encoding='utf-8'))['assets']}
    keys = [l.strip() for l in open(os.path.join(DAY, 'order.txt'), encoding='utf-8') if l.strip() and not l.startswith('#')]
    n = {}
    for id_, key in VARIANTES:
        a = cat.get(id_)
        if not a:
            sys.exit('%s no está en el catálogo del paquete' % id_)
        if key not in keys:
            sys.exit('%s: «%s» no es una portada de src/img/day/order.txt' % (id_, key))
        if not a.get('auto_select'):
            sys.exit('%s: el catálogo no deja elegirla sola (auto_select)' % id_)
        sex = {'male': '', 'female': 'mujer'}[a['model']]
        n[sex, key] = n.get((sex, key), 1) + 1
        if only and id_ not in only:
            continue
        im = Image.open(os.path.join(pack, a['asset_path'])).convert('L')
        if im.size != (a['width'], a['height']):
            sys.exit('%s: mide %d × %d y el catálogo dice %d × %d' % (id_, *im.size, a['width'], a['height']))
        if id_ in BORRAR:
            im = borrar(im, BORRAR[id_])
        fy = FOCO.get(id_, float(a['object_position'].split()[1].rstrip('%')) / 100)
        save(frame(im, fy), os.path.join(DAY, sex, '%s-%d.webp' % (key, n[sex, key])))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2:])
