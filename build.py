#!/usr/bin/env python3
"""StrataFit · build

Compila src/ en la app. Necesita Python 3, node y los paquetes de «npm install»: esbuild, que une los módulos ES y comprime
el código, y typescript, con el que tools/templates.js lee las plantillas html`…` para dejarlas en una línea antes de compilar.

  python3 build.py                 → dist/app/  (index.html + js/ + sw.js + version.json + manifiesto + iconos + img/, para GitHub Pages)
                                     dist/stratafit.html  (archivo único con todo incrustado, sin service worker)
  python3 build.py --check         → además ejecuta las comprobaciones estáticas (tools/check.js, necesita node + typescript)
  python3 build.py --only app      → solo el paquete de despliegue
  python3 build.py --only single   → solo el archivo único
  python3 build.py --version       → escribe la versión (APPV) y termina
  python3 build.py --notes         → escribe la entrada de CHANGELOG.md de esa versión (notas de la publicación en GitHub)

Estructura (todo vive en src/):
  src/index.html          plantilla (@@CSS@@ y @@JS@@ se sustituyen al compilar)
  src/css/NN-nombre.css   trozos de CSS; se concatenan por orden alfabético (el orden importa por la cascada)
  src/js/main.js          punto de entrada: importa los módulos en orden de carga (cada uno registra sus manejadores)
  src/js/<area>/<m>.js    módulos ES (import/export); esbuild los une: en un solo <script> (archivo único) o en js/
                          con lo poco usado en archivos aparte que se cargan al usarlo (paquete). Sus plantillas html`…`
                          pueden ocupar varias líneas: esos saltos no llegan a la app (flat_js)
  src/js/data/media.js    molde que el build sustituye por las fotos de src/img/ (rutas o base64 según la variante)
  src/js/data/release.js  molde que el build sustituye por las novedades de la versión actual (de CHANGELOG.md)
  src/fig3d/              el motor de las figuras 3D: scripts clásicos «(function (G) {…})(window);», en el orden de FIG3D_FILES,
                          que también usan las páginas de revisión de tools/figuras3d
  src/js/extras/motor3d.js  molde que el build sustituye por ese motor, metido en una función (se carga al usarlo: core/lazy)
  CHANGELOG.md            historial de versiones: la entrada de APPV es obligatoria; de aquí salen las novedades y version.json
                          (la revisión de una versión enseña sus arreglos junto con las novedades de la que revisa)
  src/img/day/            portadas de los días (.webp o .jpg), en el orden de order.txt; las de mujer, en mujer/ (tools/portadas.py);
                          sus otras fotos, <clave>-2.webp… (tools/variantes.py)
  src/img/login/          fondo del inicio de sesión (fondo.webp, que prepara tools/fondo.py)
  static/                 sw.js (plantilla: la lista de precarga se completa con las fotos), manifiesto e iconos

Las dos variantes solo se diferencian en:
  · FFDEP (core/util): 0 en el archivo único, 1 en el paquete (cabecera fija, aviso de versión nueva, sin recarga forzada);
  · data/media: base64 en el archivo único, rutas img/… en el paquete;
  · la CSP (csp_meta): las dos admiten la huella de sus <script> en línea, y el paquete además sus archivos js/ ('self').
El paquete lleva además version.json (versión publicada y sus novedades), que la app consulta para avisar de actualizaciones.
"""
import os, re, sys, json, base64, hashlib, shutil, subprocess, argparse

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
IMG = os.path.join(SRC, 'img')
ENTRY = 'main.js'
MEDIA_MODULE = 'data/media.js'
RELEASE_MODULE = 'data/release.js'
FIG3D_MODULE = 'extras/motor3d.js'
FIG3D = os.path.join(SRC, 'fig3d')
# los archivos del motor 3D, en el orden en que se cargan: cada uno usa lo que dejan los anteriores en Fig3D
FIG3D_FILES = ('fig3d.js', 'gear3d.js', 'mov3d.js', 'tiron3d.js', 'piernas3d.js', 'brazos3d.js', 'hombros3d.js', 'core3d.js', 'funcional3d.js', 'cardio3d.js')
CHANGELOG = os.path.join(ROOT, 'CHANGELOG.md')
CHANGELOG_EN = os.path.join(ROOT, 'CHANGELOG.en.md')
USER_SECTIONS = ('Novedades', 'Mejoras', 'Correcciones')  # apartados que la app enseña al usuario
# los mismos apartados en CHANGELOG.en.md (las notas de cada versión en inglés), con el nombre del que son en español
EN_SECTIONS = {"What's new": 'Novedades', 'Improvements': 'Mejoras', 'Fixes': 'Correcciones'}
VERSION = r'\d+\.\d+\.\d+(?:\.\d+)?'  # 1.1.0 o, la revisión de una versión, 1.1.0.1


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, t):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(t)


def die(msg):
    print('ERROR:', msg)
    sys.exit(1)


def module_list():
    """Módulos en orden de carga: los «import './…';» de src/js/main.js."""
    out = []
    for l in read(os.path.join(SRC, 'js', ENTRY)).splitlines():
        m = re.match(r"^import '\./([^']+)';$", l.strip())
        if m:
            out.append(m.group(1))
    return out


def lazy_modules():
    """Módulos que se cargan al usarlos: los import('…') de src/js/core/lazy.js."""
    return [os.path.normpath(os.path.join('core', m)).replace(os.sep, '/') for m in re.findall(r"import\('([^']+)'\)", read(os.path.join(SRC, 'js', 'core', 'lazy.js')))]


def check_tree(mods):
    seen = set()
    for m in mods:
        if m in seen:
            die('módulo importado dos veces en main.js: ' + m)
        seen.add(m)
        if not os.path.isfile(os.path.join(SRC, 'js', m)):
            die('main.js importa un módulo que no existe: ' + m)
    for dp, _, fs in os.walk(os.path.join(SRC, 'js')):
        for f in fs:
            if f.endswith('.js'):
                rel = os.path.relpath(os.path.join(dp, f), os.path.join(SRC, 'js')).replace(os.sep, '/')
                if rel not in seen and rel != ENTRY and rel not in lazy_modules():
                    die('módulo que ni main.js importa ni core/lazy.js carga: ' + rel)
    if mods[-1] != 'core/boot.js':
        die('core/boot.js debe ser el último módulo (arranque)')
    if mods[0] != 'core/util.js':
        die('core/util.js debe ser el primero')
    for gm in (MEDIA_MODULE, RELEASE_MODULE):
        if gm not in seen:
            die('main.js debe importar ' + gm)
    if FIG3D_MODULE not in lazy_modules():
        die('core/lazy.js debe cargar ' + FIG3D_MODULE)


# ── fotos ──────────────────────────────────────────────────────────────────────────────────────────────────────────

def list_lines(p):
    return [l.split('#')[0].strip() for l in read(p).splitlines() if l.split('#')[0].strip()]


BRAND_LOGOS = ('claro', 'oscuro')
LOGIN_PHOTO = 'img/login/fondo.webp'
EQUIPMENT_MODULE = os.path.join(SRC, 'js', 'data', 'equipment.js')
CATALOG_MODULE = os.path.join(SRC, 'js', 'data', 'catalog.js')


def catalog_ids():
    """Los ids de las imágenes de las tarjetas de la librería que nombra data/catalog.js («'Pecho': ['chest', 339, 192]»)."""
    ids = re.findall(r"'[^']+': \['([\w-]+)', \d+, \d+", read(CATALOG_MODULE))
    if not ids:
        die('no encuentro los grupos de las tarjetas de la librería en ' + os.path.relpath(CATALOG_MODULE, ROOT))
    return ids


def equipment_icons():
    """Los iconos que nombra data/equipment.js (el segundo texto de cada material: «'id': ['Nombre', 'icono']»)."""
    names = re.findall(r"'[\w-]+': \['[^']+', '([\w-]+)'\]", read(EQUIPMENT_MODULE))
    if not names:
        die('no encuentro los iconos del equipamiento en ' + os.path.relpath(EQUIPMENT_MODULE, ROOT))
    return sorted(set(names))


def cover_file(folder, k):
    """El archivo de la portada `k` en una carpeta de src/img/day: <k>.webp o <k>.jpg (None si no está)."""
    found = [k + ext for ext in ('.webp', '.jpg') if os.path.isfile(os.path.join(folder, k + ext))]
    if len(found) > 1:
        die('la portada %s está dos veces en %s (%s): deja una' % (k, folder, ' y '.join(found)))
    return found[0] if found else None


def cover_variants(folder, rel, k):
    """Las otras versiones de la portada `k` en una carpeta de src/img/day (tools/variantes.py): <k>-2.webp, <k>-3.webp… seguidas,
    como enlaces img/…; [] si no tiene."""
    out, n = [], 2
    while os.path.isfile(os.path.join(folder, '%s-%d.webp' % (k, n))):
        out.append('%s%s-%d.webp' % (rel, k, n))
        n += 1
    return out


def media():
    """Lee src/img: las portadas de día (order.txt; las de mujer, en src/img/day/mujer, las que haya; y sus otras versiones,
    <clave>-2.webp…), el logo, el fondo del inicio de sesión, los iconos del equipamiento y las imágenes de las tarjetas de la
    librería. Devuelve la lista de imágenes y los enlaces de cada portada, de cada icono y de cada tarjeta (clave → img/…)."""
    files, day, day_f, more, more_f = [], {}, {}, {}, {}
    base = os.path.join(IMG, 'day')
    for k in list_lines(os.path.join(base, 'order.txt')):
        f = cover_file(base, k)
        if not f:
            die('falta la portada src/img/day/%s.webp (o .jpg)' % k)
        day[k] = 'img/day/' + f
        files.append((day[k], os.path.join(base, f)))
        f = cover_file(os.path.join(base, 'mujer'), k)
        if f:
            day_f[k] = 'img/day/mujer/' + f
            files.append((day_f[k], os.path.join(base, 'mujer', f)))
        for folder, rel, out in ((base, 'img/day/', more), (os.path.join(base, 'mujer'), 'img/day/mujer/', more_f)):
            v = cover_variants(folder, rel, k)
            if v:
                out[k] = v
                files.extend((r, os.path.join(folder, r.split('/')[-1])) for r in v)
    # el logo dentro de la app (core/brand): claro y oscuro. Las fuentes (fuente-*.png) no se publican: son de tools/marca.py
    for k in BRAND_LOGOS:
        p = os.path.join(IMG, 'brand', 'logo-%s.webp' % k)
        if not os.path.isfile(p):
            die('falta el logo %s (python3 tools/marca.py)' % p)
        files.append(('img/brand/logo-%s.webp' % k, p))
    # el fondo del inicio de sesión (account/login, F-33): ya desenfocado y en gris (tools/fondo.py)
    p = os.path.join(SRC, *LOGIN_PHOTO.split('/'))
    if not os.path.isfile(p):
        die('falta el fondo del inicio de sesión %s (python3 tools/fondo.py foto.jpg)' % p)
    files.append((LOGIN_PHOTO, p))
    # los iconos del equipamiento (workout/equipment): los del catálogo en WebP (tools/equipamiento.py) y los dibujados en SVG
    equip, folder = {}, os.path.join(IMG, 'equipment')
    for k in equipment_icons():
        found = [k + ext for ext in ('.webp', '.svg') if os.path.isfile(os.path.join(folder, k + ext))]
        if len(found) != 1:
            die('el icono de equipamiento %s tiene que estar una vez en src/img/equipment (.webp o .svg): %s' % (k, found or 'no está'))
        equip[k] = 'img/equipment/' + found[0]
        files.append((equip[k], os.path.join(folder, found[0])))
    # las tarjetas de los grupos de la librería (library/catalog): la ilustración de cada uno (tools/catalogo.py)
    cat, cfolder = {}, os.path.join(IMG, 'catalog')
    for k in catalog_ids():
        p = os.path.join(cfolder, k + '.webp')
        if not os.path.isfile(p):
            die('falta la ilustración de la tarjeta %s (python3 tools/catalogo.py paquete)' % os.path.relpath(p, ROOT))
        cat[k] = 'img/catalog/' + k + '.webp'
        files.append((cat[k], p))
    used = {p for _, p in files}
    for folder, why in ((folder, 'data/equipment.js'), (cfolder, 'data/catalog.js')):
        for f in sorted(os.listdir(folder)) if os.path.isdir(folder) else []:
            if os.path.join(folder, f) not in used:
                print('  aviso: %s no lo nombra %s y no se usa' % (os.path.relpath(os.path.join(folder, f), ROOT), why))
    for folder in (base, os.path.join(base, 'mujer')):
        for f in sorted(os.listdir(folder)) if os.path.isdir(folder) else []:
            if f.endswith(('.jpg', '.webp')) and os.path.join(folder, f) not in used:
                print('  aviso: %s no está en su lista y no se usa' % os.path.relpath(os.path.join(folder, f), ROOT))
    return {'files': files, 'day': day, 'dayF': day_f, 'dayMore': more, 'dayMoreF': more_f, 'equip': equip, 'cat': cat}


def media_js(m, inline):
    def url(rel, p):
        if not inline:
            return rel
        mime = 'image/jpeg' if p.endswith('.jpg') else 'image/svg+xml' if p.endswith('.svg') else 'image/webp'
        with open(p, 'rb') as f:
            return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode('ascii'))
    src = dict(m['files'])
    obj = {
        'day': {k: url(rel, src[rel]) for k, rel in m['day'].items()},
        'dayF': {k: url(rel, src[rel]) for k, rel in m['dayF'].items()},
        'dayMore': {k: [url(rel, src[rel]) for rel in v] for k, v in m['dayMore'].items()},
        'dayMoreF': {k: [url(rel, src[rel]) for rel in v] for k, v in m['dayMoreF'].items()},
        'brand': {k: url('img/brand/logo-%s.webp' % k, src['img/brand/logo-%s.webp' % k]) for k in BRAND_LOGOS},
        'login': url(LOGIN_PHOTO, src[LOGIN_PHOTO]),
        'equip': {k: url(rel, src[rel]) for k, rel in m['equip'].items()},
        'cat': {k: url(rel, src[rel]) for k, rel in m['cat'].items()},
    }
    return 'export const MEDIA = ' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';'


# ── novedades (CHANGELOG.md) ────────────────────────────────────────────────────────────────────────────────────────

def plain(s):
    """Texto sin marcas de Markdown (**negrita**, `código`, [enlace](url))."""
    s = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', s)
    return re.sub(r'\*\*|__|`', '', s).strip()


# las revisiones de la 1.0.3 se numeraron añadiendo una cifra a su tercer número: la 1.0.31 y la 1.0.32 son la 1.0.3.1 y la
# 1.0.3.2, anteriores a la 1.0.4 (lo mismo en la app: system/updates, isNewerVersion)
OLD_REVISIONS = {'1.0.31': '1.0.3.1', '1.0.32': '1.0.3.2'}


def version_key(v):
    """Las cifras de una versión, para compararla con otra como lo hace el aviso de versión nueva de la app."""
    return [int(x) for x in OLD_REVISIONS.get(v, v).split('.')]


def changelog(path=None, titles=USER_SECTIONS):
    """Versiones de CHANGELOG.md, de la más nueva a la más antigua: [{version, date, sections: [{title, items}]}].
    (Con `path` y `titles`, las de otro archivo con otros nombres de apartado: CHANGELOG.en.md, las notas en inglés.)
    Solo los apartados que ve el usuario; «Interno» y las entradas sin fecha se ignoran. Antes del primer apartado, las líneas
    que empiezan por «> » son la cabecera de la versión: la primera, su título, y las demás, su texto. Es un apartado más, el
    primero y marcado (`lead`): la app lo enseña destacado encima de los otros, y una instalada anterior a la 1.0.4, que no
    sabe de cabeceras, como un apartado cualquiera. La revisión de una versión lleva en `base` la que revisa: la de sus tres
    primeras cifras si tiene cuatro (1.1.0.1 revisa la 1.1.0) o la que diga antes de su primer apartado («Revisión de la
    [1.0.3]…»: las de la 1.0.3, que se numeraron 1.0.31 y 1.0.32)."""
    out, cur, sec, head = [], None, None, False
    for raw in read(path or CHANGELOG).splitlines():
        l = raw.rstrip()
        if l.startswith('## '):
            m = re.match(r'^## \[(' + VERSION + r')\]\s*[—–-]\s*(\d{4}-\d{2}-\d{2})$', l)
            cur = {'version': m.group(1), 'date': m.group(2), 'sections': []} if m else None
            if cur:
                out.append(cur)
                if cur['version'].count('.') == 3:
                    cur['base'] = cur['version'].rsplit('.', 1)[0]
            sec, head = None, True
        elif cur is None:
            continue
        elif l.startswith('### '):
            title = l[4:].strip()
            sec = {'title': title, 'items': []} if title in titles else None
            if sec:
                cur['sections'].append(sec)
            head = False
        elif head and l.startswith('> '):
            lead = next((s for s in cur['sections'] if s.get('lead')), None)
            if lead is None:
                cur['sections'].insert(0, {'title': plain(l[2:]), 'items': [], 'lead': True})
            elif lead['items']:
                lead['items'][-1] += ' ' + plain(l[2:])
            else:
                lead['items'].append(plain(l[2:]))
        elif head and re.match(r'^Revisión de la \[(' + VERSION + r')\]', l):
            said = re.match(r'^Revisión de la \[(' + VERSION + r')\]', l).group(1)
            if cur.get('base', said) != said:
                die('CHANGELOG.md: la %s es, por su número, una revisión de la %s, y dice que lo es de la %s' % (cur['version'], cur['base'], said))
            cur['base'] = said
        elif sec is not None and re.match(r'^[-*] ', l):
            sec['items'].append(plain(l[2:]))
        elif sec is not None and l.strip() and sec['items'] and raw.startswith('  '):
            sec['items'][-1] += ' ' + plain(l)
    for e in out:
        e['sections'] = [s for s in e['sections'] if s['items'] or s.get('lead')]
    return out


def english(entries):
    """Pone a cada versión sus notas en inglés (`en`: los apartados de su entrada en CHANGELOG.en.md), que son las que enseña
    la app cuando está en inglés. La entrada en inglés tiene que decir lo mismo que la de CHANGELOG.md: los mismos apartados,
    en el mismo orden y con los mismos puntos (y su cabecera, si la tiene). Una versión sin entrada en inglés se enseña en
    español; solo las hay desde la 1.0.4, que es la primera con la app en inglés."""
    en = {e['version']: e for e in changelog(CHANGELOG_EN, tuple(EN_SECTIONS))} if os.path.exists(CHANGELOG_EN) else {}
    known = {e['version'] for e in entries}
    for v in en:
        if v not in known:
            die('CHANGELOG.en.md: la versión %s no está en CHANGELOG.md' % v)
    shape = lambda sections, name: [('cabecera' if s.get('lead') else name(s['title']), len(s['items'])) for s in sections]
    for e in entries:
        x = en.get(e['version'])
        if x is None:
            continue
        a, b = shape(e['sections'], lambda t: t), shape(x['sections'], lambda t: EN_SECTIONS[t])
        if a != b or x['date'] != e['date']:
            die('CHANGELOG.en.md: la %s no dice lo mismo que en CHANGELOG.md (apartados y puntos de cada uno: %s en español y %s en inglés)' % (e['version'], a, b))
        e['en'] = x['sections']
    return entries


def cards(entries):
    """Las versiones tal como las enseña la app (el aviso de versión nueva, las novedades y Ajustes). Una revisión no tiene
    tarjeta propia: es la de la versión que revisa con lo suyo delante, y cada apartado dice de cuál es («Correcciones de la
    1.0.31», «Novedades de la 1.0.3»…). Así, quien ya tenía esa versión ve qué arregla la revisión y quien llega de una
    anterior lo ve todo, una sola vez: la versión revisada (y sus revisiones anteriores) ya no sale aparte en la lista."""
    out, covered = [], set()
    for i, e in enumerate(entries):
        if e['version'] in covered:
            continue
        if not e.get('base'):
            out.append({'version': e['version'], 'date': e['date'], 'sections': e['sections']})
            if e.get('en'):
                out[-1]['en'] = e['en']
            continue
        # de la revisión a la versión que revisa, pasando por las revisiones anteriores de la misma
        chain = [e]
        for x in entries[i + 1:]:
            chain.append(x)
            if x['version'] == e['base']:
                break
            if x.get('base') != e['base']:
                die('CHANGELOG.md: entre la revisión %s y la %s que revisa está la %s, que no es otra revisión suya' % (e['version'], e['base'], x['version']))
        if chain[-1]['version'] != e['base'] or len(chain) < 2:
            die('CHANGELOG.md: la %s dice que revisa la %s, que no está más abajo' % (e['version'], e['base']))
        # la cabecera de la tarjeta: la de la revisión o, si no tiene, la de la versión que revisa; va delante y sin apellido
        leads = [s for x in chain for s in x['sections'] if s.get('lead')]
        out.append({'version': e['version'], 'date': e['date'],
                    'sections': leads[:1] + [{'title': '%s de la %s' % (s['title'], x['version']), 'items': s['items']}
                                             for x in chain for s in x['sections'] if not s.get('lead')]})
        # y lo mismo en inglés, si todas las de la tarjeta tienen sus notas en inglés
        if all(x.get('en') for x in chain):
            leads = [s for x in chain for s in x['en'] if s.get('lead')]
            out[-1]['en'] = leads[:1] + [{'title': '%s in %s' % (s['title'], x['version']), 'items': s['items']}
                                         for x in chain for s in x['en'] if not s.get('lead')]
        covered.update(x['version'] for x in chain[1:])
    return out


def release_for(entries, ver):
    if not entries or entries[0]['version'] != ver:
        die('CHANGELOG.md debe empezar por la entrada de la versión %s («## [%s] — AAAA-MM-DD»)' % (ver, ver))
    if not [s for s in entries[0]['sections'] if not s.get('lead')]:
        die('la entrada %s de CHANGELOG.md no tiene Novedades, Mejoras ni Correcciones que enseñar' % ver)
    return entries[0]


def release_notes(ver):
    """Texto Markdown de la entrada de `ver` en CHANGELOG.md (todos sus apartados), para la publicación en GitHub."""
    m = re.search(r'^## \[' + re.escape(ver) + r'\][^\n]*\n(.*?)(?=^## |\Z)', read(CHANGELOG), re.S | re.M)
    if not m:
        die('CHANGELOG.md no tiene la entrada %s' % ver)
    return m.group(1).strip() + '\n'


def release_js(rel):
    return 'export const RELEASE = ' + json.dumps(rel, ensure_ascii=False, separators=(',', ':')) + ';'


def old_newer(a, b):
    """¿La versión a es posterior a b para el aviso de versión nueva de las apps instaladas hasta la 1.0.31? Es su comparador,
    tal cual (system/updates de la 1.0.31): parte el texto por los puntos y compara como números los tres primeros trozos; uno
    que no es un número cuenta como 0."""
    def nums(v):
        out = []
        for p in str(v or '').split('.'):
            p = p.strip()  # Number() no mira los espacios de los lados (tampoco los de no separación)
            out.append(float(p) if re.fullmatch(r'\d+(\.\d+)?', p) else 0.0)
        return out + [0.0, 0.0, 0.0]
    x, y = nums(a), nums(b)
    for i in range(3):
        if x[i] != y[i]:
            return x[i] > y[i]
    return False


# la última versión con ese comparador de tres cifras, y el punto que no parte el texto: U+2024 («one dot leader»), que se ve
# como un punto y el comparador no toma por uno, seguido de U+2060 («word joiner», sin ancho), para que el título no se
# pueda partir de línea detrás de él (se leería «Versión 1.0.» y, debajo, «4 de nov. 2026»)
LAST_OLD = '1.0.31'
DOT = '\u2024\u2060'
MONTHS = ('ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic')


def legacy_version(ver, date):
    """El campo `version` de version.json: lo que comparan con la suya, y enseñan en el título del aviso («Versión …»), las apps
    instaladas hasta la 1.0.31. Para ellas, que solo miran tres cifras, la 1.0.4 es anterior a la 1.0.31 (4 < 31) y no
    avisarían. Mientras la versión no sea posterior a la 1.0.31 también para ese comparador (lo será desde la 1.0.32 o la
    1.1.0), se escribe de modo que lo sea y se lea igual: «1.0.4 de nov. 2026», con el segundo punto (y los siguientes) de
    los que no parten el texto y, tras el punto de la abreviatura del mes, el año. Ese comparador ve [1, 0, 2026]: posterior a
    cualquier 1.0.x. Los espacios de «de nov. 2026» son de no separación: si no cabe en una línea, se parte antes de «de».
    Las apps desde la 1.0.4 no usan este campo: leen la versión de verdad en `number`. (Las versiones hasta la 1.0.31 se
    publicaron con su número tal cual, y así se quedan.)"""
    if old_newer(ver, LAST_OLD) or version_key(ver) <= version_key(LAST_OLD):
        return ver
    y, m, _ = date.split('-')
    head, _, rest = ver.partition('.')
    out = '%s.%s de\u00a0%s.\u00a0%s' % (head, rest.replace('.', DOT), MONTHS[int(m) - 1], y)
    if not old_newer(out, LAST_OLD):
        die('no se ha podido escribir la versión %s para el aviso de las apps instaladas hasta la %s' % (ver, LAST_OLD))
    return out


def version_json(entries):
    """version.json del paquete: la versión publicada con sus novedades y las de las anteriores (por si alguien salta varias).
    `number` es la versión; `version`, lo que leen de ella las apps instaladas hasta la 1.0.31 (legacy_version)."""
    top = entries[0]
    out = {'version': legacy_version(top['version'], top['date']), 'number': top['version'], 'date': top['date'],
           'sections': top['sections'], 'history': entries[:6]}
    # las notas en inglés (`en`, arriba y en cada versión de la lista): las apps instaladas hasta la 1.0.31 no las miran
    if top.get('en'):
        out['en'] = top['en']
    return json.dumps(out, ensure_ascii=False, indent=1) + '\n'


# ── compilación ────────────────────────────────────────────────────────────────────────────────────────────────────

def motor3d_js():
    """El módulo del motor 3D (extras/motor3d): los archivos de src/fig3d, cada uno con su «(function (G) {…})(window);», dentro
    de una función que les pasa, en vez de window, un objeto con el mapa muscular y las regiones de cada músculo (lo que en las
    páginas de revisión está en window.FIG_MAP y window.FIG_REG), y que devuelve Fig3D. Así el motor no toca window y va en
    modo estricto, como el resto del código."""
    have = sorted(f for f in os.listdir(FIG3D) if f.endswith('.js'))
    if have != sorted(FIG3D_FILES):
        die('src/fig3d debe tener justo estos archivos: ' + ', '.join(FIG3D_FILES))
    body = []
    for f in FIG3D_FILES:
        t = read(os.path.join(FIG3D, f)).rstrip()
        if t.count('})(window);') != 1 or not t.endswith('})(window);') or len(re.findall(r'^\(function \(G\) \{$', t, re.M)) != 1:
            die('src/fig3d/%s debe ser una sola función «(function (G) {» … «})(window);»' % f)
        body.append(t[:-len('})(window);')] + '})(G);')
    return 'export const motor3d = (FIG_MAP, FIG_REG) => {\nconst G = { FIG_MAP, FIG_REG };\n' + '\n'.join(body) + '\nreturn G.Fig3D;\n};'


def esbuild_bin():
    """esbuild de node_modules (npm install) o el indicado en la variable ESBUILD."""
    for c in (os.environ.get('ESBUILD'), os.path.join(ROOT, 'node_modules', '.bin', 'esbuild'), shutil.which('esbuild')):
        if c and os.path.isfile(c):
            return c
    die('falta esbuild: ejecuta «npm install» (o indica su ruta en la variable ESBUILD)')


# código para navegadores de 2020 en adelante (iOS 14+); comprimido, con los textos en UTF-8 tal cual
ESBUILD_COMMON = ['--bundle', '--minify', '--target=es2020', '--charset=utf8', '--legal-comments=none', '--log-level=warning']


def run_esbuild(args, stdin=None):
    r = subprocess.run([esbuild_bin()] + args, input=stdin, capture_output=True, text=True, cwd=ROOT)
    if r.returncode:
        die('esbuild:\n' + (r.stderr or r.stdout))
    if r.stderr.strip():
        print(r.stderr.rstrip())
    return r.stdout


def flat_js():
    """Copia de src/js con cada plantilla html`…` en una línea (tools/templates.js): de ella parte cada variante.

    En src/js una plantilla larga va en varias líneas, y esos saltos de línea no forman parte del HTML: aquí se quitan, así
    que la app compilada es la misma, byte a byte, se escriba una plantilla en una línea o en veinte. Un salto de línea que
    cambiaría el HTML (entre dos palabras, dentro del valor de un atributo) para la compilación con su archivo y su línea.
    Se prepara una vez por compilación, en dist/.flat, que se borra al terminar."""
    flat = os.path.join(DIST, '.flat')
    if not FLAT_DONE:
        shutil.rmtree(flat, ignore_errors=True)
        shutil.copytree(os.path.join(SRC, 'js'), flat)
        node = shutil.which('node')
        if not node:
            die('falta node: lo necesita tools/templates.js para preparar las plantillas html`…`')
        r = subprocess.run([node, os.path.join(ROOT, 'tools', 'templates.js'), '--flat', flat], capture_output=True, text=True)
        if r.returncode:
            die('plantillas html`…` (tools/templates.js):\n' + (r.stderr or r.stdout).strip())
        FLAT_DONE.append(1)
    return flat


FLAT_DONE = []


def stage(generated, deploy, emu=False, appcheck=False):
    """Copia el código (flat_js) a una carpeta temporal con los moldes generados (data/media, data/release) y, en el
    paquete, FFDEP = 1."""
    # siempre la misma carpeta: esbuild tiene en cuenta las rutas al calcular los nombres de los archivos, y así salen iguales
    st = os.path.join(DIST, '.stage')
    shutil.rmtree(st, ignore_errors=True)
    shutil.copytree(flat_js(), st)
    for m, code in generated.items():
        p = os.path.join(st, m)
        t = read(p)
        name = re.match(r'export const (\w+)', code).group(1)
        head = re.match(r'\s*/\*.*?\*/\s*', t, re.S)
        if not head or len(re.findall(r'^export const ' + name + r'\s*=', t, re.M)) != 1:
            die('%s debe tener su cabecera y una sola línea «export const %s = …»' % (m, name))
        write(p, head.group(0) + code + '\n')
    if emu:
        p = os.path.join(st, 'cloud', 'config.js')
        t = read(p)
        for a, b in EMU_CONFIG.items():
            if t.count(a) != 1:
                die('cloud/config.js debe tener una vez: ' + a)
            t = t.replace(a, b)
        # el emulador no tiene App Check: sin él, aunque esté configurado para la app publicada
        t = re.sub(r"export const APP_CHECK = \{[^}]*\};", "export const APP_CHECK = { siteKey: '', appId: '' };", t)
        write(p, t)
    if appcheck:
        p = os.path.join(st, 'cloud', 'config.js')
        t, n = re.subn(r"export const APP_CHECK = \{[^}]*\};", "export const APP_CHECK = { siteKey: '%s', appId: '%s' };" % APPCHECK_TEST, read(p))
        if n != 1:
            die('cloud/config.js debe declarar una vez «export const APP_CHECK = { … };»')
        write(p, t)
    if deploy:
        p = os.path.join(st, 'core', 'util.js')
        t, n = re.subn(r'^export const FFDEP = 0;', 'export const FFDEP = 1;', read(p), flags=re.M)
        if n != 1:
            die('core/util.js debe declarar una vez «export const FFDEP = 0;»')
        write(p, t)
    return st


def bundle_single(st):
    """Archivo único: todo en un script clásico (IIFE), también lo que en el paquete se carga al usarlo."""
    out = os.path.join(st, '_out.js')
    run_esbuild([os.path.join(st, ENTRY), '--format=iife', '--outfile=' + out] + ESBUILD_COMMON)
    js = read(out)
    if '</script' in js.lower():
        die('"</script" dentro del JS compilado rompería el HTML')
    return js


def bundle_app(st, outdir):
    """Paquete: módulos ES en js/ con nombres que cambian con el contenido. Los import() dinámicos (lo poco usado) quedan
    en archivos aparte. Devuelve el archivo de entrada, los que importa al arrancar y todos los generados."""
    meta = os.path.join(st, '_meta.json')
    # rutas relativas a la raíz del repositorio: los nombres por contenido salen iguales en cualquier ordenador
    rel_root = lambda p: os.path.relpath(p, ROOT)
    run_esbuild([rel_root(os.path.join(st, ENTRY)), '--format=esm', '--splitting', '--outdir=' + rel_root(outdir), '--entry-names=[name]-[hash]',
                 '--chunk-names=[name]-[hash]', '--metafile=' + meta] + ESBUILD_COMMON)
    outs = json.loads(read(meta))['outputs']
    rel = lambda p: 'js/' + os.path.basename(p)
    # la entrada es la de main.js: los import() dinámicos también salen como entradas (extras/figure3d, data/exinfo…) y el orden
    # en que esbuild las lista no es el de siempre
    main_in = rel_root(os.path.join(st, ENTRY)).replace(os.sep, '/')
    entry = next(p for p, o in outs.items() if o.get('entryPoint') == main_in)
    eager, todo = [], [entry]
    while todo:
        for i in outs[todo.pop()].get('imports', []):
            if i['kind'] == 'import-statement' and rel(i['path']) not in eager:
                eager.append(rel(i['path']))
                todo.append(next(p for p in outs if rel(p) == rel(i['path'])))
    return rel(entry), eager, sorted(rel(p) for p in outs)


def compile_css():
    """Une los trozos de CSS por orden alfabético y los comprime con esbuild."""
    d = os.path.join(SRC, 'css')
    names = sorted(f for f in os.listdir(d) if f.endswith('.css'))
    css = run_esbuild(['--loader=css', '--minify', '--log-level=warning'], ''.join(read(os.path.join(d, f)) for f in names)).strip()
    if '</style' in css.lower():
        die('"</style" dentro del CSS')
    return css


def app_version(js):
    m = re.search(r"export const APPV\s*=\s*'([^']+)'", js)
    return m.group(1) if m else '?'


HEAD_TAGS = '''<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-dark-192.png" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/png" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="StrataFit">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f3f3f7" media="(prefers-color-scheme: light)">'''
# theme-color: el color de la barra del sistema sigue al tema del móvil (el primero cuyo media encaja); si el tema se elige
# a mano en Ajustes, core/state applyTheme() pone delante otra etiqueta sin media con el color de ese tema


# Política de seguridad del contenido (CSP), en una etiqueta <meta> (GitHub Pages no deja poner cabeceras): solo se ejecuta
# el código de la app (sus archivos de la propia web y los <script> de la plantilla, reconocidos por su huella sha256); nada
# de atributos on…=, eval ni código de otros sitios. Estilos, igual: solo la hoja de la plantilla (por su huella), sin
# style="…" en el HTML (I-14: clases de css/99-utilities y, lo que depende de un dato, core/dynstyle). Las conexiones van solo a la propia web, a Firebase (Authentication y
# Firestore: cloud/config) y a Open Food Facts, y las
# imágenes solo pueden ser propias, data: o blob: (así un dato inyectado tampoco puede sacar información con una imagen
# de otro sitio). frame-ancestors, sandbox y report-uri no valen en <meta>: no se ponen.
CSP_CONNECT = ('https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com '
               'https://world.openfoodfacts.org https://search.openfoodfacts.org')
# --emulador: el archivo único habla con el emulador de Firebase de este ordenador (pruebas: tests/cloud.py), con un proyecto
# «demo-» que no existe en la nube. Solo cambian las direcciones de cloud/config y la CSP.
EMU_AUTH, EMU_FIRESTORE = 'http://127.0.0.1:9099', 'http://127.0.0.1:8080'
EMU_CONFIG = {
    "export const FIREBASE = { apiKey: 'AIzaSyC_KSQkQPwNjw7dDMRZ9ALzpZ3ikTUw4P4', projectId: 'stratafit-960ec' };":
        "export const FIREBASE = { apiKey: 'emulador', projectId: 'demo-stratafit' };",
    "export const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/';": "export const AUTH_URL = '" + EMU_AUTH + "/identitytoolkit.googleapis.com/v1/';",
    "export const TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';": "export const TOKEN_URL = '" + EMU_AUTH + "/securetoken.googleapis.com/v1/token';",
    "export const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/';": "export const FIRESTORE_URL = '" + EMU_FIRESTORE + "/v1/';",
}


def template_scripts(tpl):
    """Texto de los <script> de la plantilla (todos sin atributos), con el del código (@@JS@@) incluido."""
    s = re.findall(r'<script>(.*?)</script>', tpl, re.S)
    if len(s) != tpl.count('<script') or s.count('\n@@JS@@') != 1:
        die('la plantilla solo puede tener <script> sin atributos, y uno de ellos con salto + @@JS@@ dentro')
    return s


# App Check (I-05, cloud/appcheck): solo si cloud/config trae su clave, la CSP admite el script y el marco de reCAPTCHA
# Enterprise, sus propias peticiones (lo que piden sus preguntas frecuentes para una CSP sin «nonce») y el cambio de tokens
# en App Check
APPCHECK_SCRIPT = 'https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/'
APPCHECK_FRAME = 'https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/'
APPCHECK_CONNECT = 'https://content-firebaseappcheck.googleapis.com https://www.google.com/recaptcha/'
# la configuración de prueba de «--appcheck» (no existe en Firebase: reCAPTCHA y App Check van simulados en tests/cloud.py)
APPCHECK_TEST = ('clave-de-prueba', '1:1234:web:abcd')


def app_check_on():
    """¿Trae cloud/config la configuración de App Check (clave de sitio e id de la app)?"""
    t = read(os.path.join(SRC, 'js', 'cloud', 'config.js'))
    m = re.search(r"export const APP_CHECK = \{ siteKey: '([^']*)', appId: '([^']*)' \};", t)
    if not m:
        die('cloud/config.js debe definir APP_CHECK = { siteKey: \'…\', appId: \'…\' } en una línea')
    return bool(m.group(1) and m.group(2))


def sha256(s):
    return "'sha256-%s'" % base64.b64encode(hashlib.sha256(s.encode('utf-8')).digest()).decode()


def csp_meta(scripts, css, files, emu=False, appcheck=None):
    """<meta> con la CSP: la huella de cada <script> en línea (`scripts`, su texto exacto) y de la hoja de estilo en línea
    (`css`) y, con `files`, el código de la web. Sin estilos en línea (I-14): ni style="…" ni otros <style>; lo que cambia con
    un dato se pone desde el código (core/dynstyle). `appcheck`: con App Check o sin él, diga lo que diga cloud/config."""
    if any('\r' in s or '\0' in s for s in scripts):
        # el navegador los cambia al leer la página (\r\n → \n): la huella ya no coincidiría y el <script> no se ejecutaría
        die('\\r o \\0 dentro de un <script>')
    sha = [sha256(s) for s in scripts]
    ac = (app_check_on() if appcheck is None else appcheck) and not emu
    pol = ["default-src 'self'", ' '.join(['script-src'] + (["'self'"] if files else []) + sha + ([APPCHECK_SCRIPT] if ac else [])), "style-src 'self' " + sha256(css),
           "img-src 'self' data: blob:", "media-src 'self' data: blob:", "font-src 'self' data:", "connect-src 'self' " + CSP_CONNECT + (' %s %s' % (EMU_AUTH, EMU_FIRESTORE) if emu else '') + (' ' + APPCHECK_CONNECT if ac else ''),
           # el archivo único no trae manifiesto: system/updates genera uno en un blob: (el paquete usa el estático)
           "worker-src 'self'", "manifest-src 'self'" + ('' if files else ' blob:'), "object-src 'none'", "base-uri 'none'", "form-action 'none'"]
    if ac:
        pol.append('frame-src ' + APPCHECK_FRAME)
    return '<meta http-equiv="Content-Security-Policy" content="%s">' % '; '.join(pol)


def page(tpl, css, js, emu=False, appcheck=None):
    """Archivo único: todo en línea, con la CSP que admite justo sus dos <script> (el de arranque y el código)."""
    sc = ['\n' + js if s == '\n@@JS@@' else s for s in template_scripts(tpl)]
    h = tpl.replace('<title>StrataFit</title>', '<title>StrataFit</title>\n' + csp_meta(sc, css, False, emu, appcheck), 1)
    # replace con texto literal: el código puede contener barras invertidas
    return h.replace('@@CSS@@', css).replace('@@JS@@', js)


def deploy_page(tpl, css, entry, eager):
    """index.html del paquete: CSP y etiquetas fijas en la cabecera (manifiesto, icono…), precarga de los módulos del arranque y
    el módulo de entrada (si no carga, la pantalla de error lo dice al momento)."""
    if tpl.count('<title>StrataFit</title>') != 1 or tpl.count('<script>\n@@JS@@</script>') != 1:
        die('la plantilla debe tener <title>StrataFit</title> y «<script>» + salto + @@JS@@ + «</script>»')
    pre = ''.join('\n<link rel="modulepreload" href="%s">' % f for f in [entry] + eager)
    sc = [s for s in template_scripts(tpl) if s != '\n@@JS@@']
    h = tpl.replace('<title>StrataFit</title>', '<title>StrataFit</title>\n' + csp_meta(sc, css, True) + '\n' + HEAD_TAGS + pre)
    # sin onerror="…" (la CSP no deja atributos on…): si el módulo no carga, lo ve el arranque de la plantilla (src/index.html)
    h = h.replace('<script>\n@@JS@@</script>', '<script type="module" src="%s"></script>' % entry)
    return h.replace('@@CSS@@', css)


def service_worker(files):
    """sw.js con la lista de precarga completa: el código (js/…) y las fotos (img/…)."""
    t = read(os.path.join(ROOT, 'static', 'sw.js'))
    if t.count('/*@@FILES@@*/') != 1:
        die('static/sw.js debe contener una vez el marcador /*@@FILES@@*/ dentro de la lista de precarga')
    return t.replace('/*@@FILES@@*/', ''.join(",'%s'" % rel for rel in files))


def static_files():
    return {n: os.path.join(ROOT, 'static', n) for n in sorted(os.listdir(os.path.join(ROOT, 'static'))) if n != 'sw.js'}


# Los textos del manifiesto (static/manifest.webmanifest: los accesos directos del icono, en Android), en inglés
MANIFEST_EN = {
    'Entreno de hoy': "Today's workout", 'Entreno': 'Workout', 'Abre el entreno que toca hoy': "Opens today's workout",
    'Nutrición de hoy': "Today's nutrition", 'Nutrición': 'Nutrition', 'Abre las comidas de hoy': "Opens today's meals",
    'Registrar el peso': 'Log your weight', 'Peso': 'Weight', 'Abre Evolución del peso': 'Opens Weight over time',
}


def manifest_en():
    """manifest.en.webmanifest: el manifiesto del paquete con sus textos en inglés. La plantilla (src/index.html) lo pone en
    lugar del otro cuando la app está en inglés. Es el mismo en todo lo demás (misma dirección de inicio: la misma app)."""
    m = json.loads(read(os.path.join(ROOT, 'static', 'manifest.webmanifest')))
    if m.get('lang') != 'es':
        die('static/manifest.webmanifest debe decir "lang": "es"')
    m['lang'] = 'en'
    for s in m.get('shortcuts', []):
        for k in ('name', 'short_name', 'description'):
            if k in s:
                if s[k] not in MANIFEST_EN:
                    die('falta en build.py (MANIFEST_EN) el inglés de «%s», del manifiesto' % s[k])
                s[k] = MANIFEST_EN[s[k]]
    return json.dumps(m, ensure_ascii=False, indent=2) + '\n'


def static_checks(js, html):
    """Comprobaciones baratas, sin dependencias externas."""
    if len(re.findall(r'window\.__ffok\s*=\s*1\b', js)) != 1:
        die('no se encuentra la marca de arranque correcto (window.__ffok)')
    if not html.rstrip().endswith('</html>'):
        die('HTML incompleto')


def node_check(js, label):
    node = shutil.which('node')
    if not node:
        print('  (node no disponible: se omite la comprobación de sintaxis)')
        return
    tmp = os.path.join(DIST, '_check.js')
    write(tmp, js)
    r = subprocess.run([node, '--check', tmp], capture_output=True, text=True)
    os.remove(tmp)
    if r.returncode:
        die('error de sintaxis en el JS compilado (%s):\n%s' % (label, r.stderr))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='comprobaciones estáticas adicionales (tools/check.js, necesita node + typescript)')
    ap.add_argument('--only', choices=['app', 'single'])
    ap.add_argument('--emulador', action='store_true', help='solo el archivo único, en dist/emu/, conectado al emulador de Firebase (pruebas)')
    ap.add_argument('--appcheck', action='store_true', help='solo el archivo único, en dist/appcheck/, con App Check configurado con valores de prueba y su CSP (pruebas)')
    ap.add_argument('--version', action='store_true', help='escribe la versión de la app y termina')
    ap.add_argument('--notes', action='store_true', help='escribe las notas de la versión (CHANGELOG.md) y termina')
    a = ap.parse_args()
    if a.version or a.notes:
        ver = app_version(read(os.path.join(SRC, 'js', 'core', 'util.js')))
        sys.stdout.write(release_notes(ver) if a.notes else ver + '\n')
        return
    mods = module_list()
    check_tree(mods)
    m = media()
    entries = cards(english(changelog()))
    if not entries or not entries[0].get('en'):
        die('CHANGELOG.en.md debe tener la entrada de la versión %s, con sus notas en inglés (es lo que enseña la app en inglés)' % (entries[0]['version'] if entries else '?'))
    css = compile_css()
    tpl = read(os.path.join(SRC, 'index.html'))
    if tpl.count('@@CSS@@') != 1 or tpl.count('@@JS@@') != 1:
        die('la plantilla debe contener @@CSS@@ y @@JS@@ una vez cada uno')
    os.makedirs(DIST, exist_ok=True)
    ver = app_version(read(os.path.join(SRC, 'js', 'core', 'util.js')))
    rel_js = release_js(release_for(entries, ver))
    m3 = motor3d_js()
    if a.emulador:
        st = stage({MEDIA_MODULE: media_js(m, inline=True), RELEASE_MODULE: rel_js, FIG3D_MODULE: m3}, deploy=False, emu=True)
        try:
            js = bundle_single(st)
        finally:
            shutil.rmtree(st, ignore_errors=True)
        os.makedirs(os.path.join(DIST, 'emu'), exist_ok=True)
        write(os.path.join(DIST, 'emu', 'stratafit.html'), page(tpl, css, js, emu=True))
        print('  dist/emu/stratafit.html  (archivo único con el emulador de Firebase: %s y %s)' % (EMU_AUTH, EMU_FIRESTORE))
        return
    if a.appcheck:
        st = stage({MEDIA_MODULE: media_js(m, inline=True), RELEASE_MODULE: rel_js, FIG3D_MODULE: m3}, deploy=False, appcheck=True)
        try:
            js = bundle_single(st)
        finally:
            shutil.rmtree(st, ignore_errors=True)
        os.makedirs(os.path.join(DIST, 'appcheck'), exist_ok=True)
        write(os.path.join(DIST, 'appcheck', 'stratafit.html'), page(tpl, css, js, appcheck=True))
        print('  dist/appcheck/stratafit.html  (archivo único con App Check configurado con valores de prueba)')
        return
    if a.only != 'app':
        st = stage({MEDIA_MODULE: media_js(m, inline=True), RELEASE_MODULE: rel_js, FIG3D_MODULE: m3}, deploy=False)
        try:
            js = bundle_single(st)
        finally:
            shutil.rmtree(st, ignore_errors=True)
        html = page(tpl, css, js)
        static_checks(js, html)
        node_check(js, 'archivo único')
        write(os.path.join(DIST, 'stratafit.html'), html)
        print('  dist/stratafit.html  %d bytes (código %d KB comprimido, fotos incrustadas)' % (len(html.encode('utf-8')), len(js.encode('utf-8')) // 1024))
    if a.only != 'single':
        out = os.path.join(DIST, 'app')
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        st = stage({MEDIA_MODULE: media_js(m, inline=False), RELEASE_MODULE: rel_js, FIG3D_MODULE: m3}, deploy=True)
        try:
            entry, eager, js_files = bundle_app(st, os.path.join(out, 'js'))
        finally:
            shutil.rmtree(st, ignore_errors=True)
        html = deploy_page(tpl, css, entry, eager)
        static_checks(''.join(read(os.path.join(out, f)) for f in js_files), html)
        write(os.path.join(out, 'index.html'), html)
        write(os.path.join(out, 'sw.js'), service_worker(js_files + [rel for rel, _ in m['files']]))
        write(os.path.join(out, 'version.json'), version_json(entries))
        for n, p in static_files().items():
            shutil.copy(p, os.path.join(out, n))
        write(os.path.join(out, 'manifest.en.webmanifest'), manifest_en())
        size = 0
        for rel, p in m['files']:
            os.makedirs(os.path.dirname(os.path.join(out, rel)), exist_ok=True)
            shutil.copy(p, os.path.join(out, rel))
            size += os.path.getsize(p)
        start = sum(os.path.getsize(os.path.join(out, f)) for f in [entry] + eager)
        later = sum(os.path.getsize(os.path.join(out, f)) for f in js_files) - start
        print('  dist/app/            index.html %d bytes + js/ (%d KB al arrancar, %d KB al usarlo, %d archivos) + sw.js, version.json, manifiesto e iconos + %d fotos en img/ (%d KB)' % (
            os.path.getsize(os.path.join(out, 'index.html')), start // 1024, later // 1024, len(js_files), len(m['files']), size // 1024))
    print('StrataFit %s · %d módulos JS (%d al usarlos) · %d trozos CSS · %d portadas de día (%d de mujer)' % (
        ver, len(mods) + len(lazy_modules()), len(lazy_modules()), len([f for f in os.listdir(os.path.join(SRC, 'css')) if f.endswith('.css')]), len(m['day']), len(m['dayF'])))
    if a.check:
        tool = os.path.join(ROOT, 'tools', 'check.js')
        if not os.path.isfile(tool):
            die('falta tools/check.js')
        r = subprocess.run(['node', tool], cwd=ROOT)
        if r.returncode:
            sys.exit(r.returncode)


if __name__ == '__main__':
    try:
        main()
    finally:
        shutil.rmtree(os.path.join(DIST, '.flat'), ignore_errors=True)
