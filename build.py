#!/usr/bin/env python3
"""StrataFit · build

Compila src/ en la app (sin dependencias, solo Python 3; node opcional para comprobar).

  python3 build.py                 → dist/app/  (index.html + sw.js + version.json + manifiesto + iconos + img/, listo para GitHub Pages)
                                     dist/stratafit.html  (archivo único con todo incrustado, sin service worker)
  python3 build.py --check         → además ejecuta las comprobaciones estáticas (tools/check.js, necesita node + typescript)
  python3 build.py --only app      → solo el paquete de despliegue
  python3 build.py --only single   → solo el archivo único

Estructura (todo vive en src/):
  src/index.html          plantilla (@@CSS@@ y @@JS@@ se sustituyen al compilar)
  src/css/NN-nombre.css   trozos de CSS; se concatenan por orden alfabético (el orden importa por la cascada)
  src/js/modules.txt      orden de carga de los módulos JS (el orden importa: ver README)
  src/js/<area>/<m>.js    módulos: listas de sentencias de ámbito global; el build las une en un solo <script>
  src/js/data/media.js    molde que el build sustituye por las fotos de src/img/ (rutas o base64 según la variante)
  src/js/data/release.js  molde que el build sustituye por las novedades de la versión actual (de CHANGELOG.md)
  CHANGELOG.md            historial de versiones: la entrada de APPV es obligatoria; de aquí salen las novedades y version.json
  src/img/day/            portadas de los días (.jpg) y order.txt
  src/img/ex/             fotos de ejercicio (.webp) y map.txt
  static/                 sw.js (plantilla: la lista de precarga se completa con las fotos), manifiesto e iconos

Las dos variantes solo se diferencian en:
  · FFDEP (core/util): 0 en el archivo único, 1 en el paquete (cabecera fija, aviso de versión nueva, sin recarga forzada);
  · data/media: base64 en el archivo único, rutas img/… en el paquete.
El paquete lleva además version.json (versión publicada y sus novedades), que la app consulta para avisar de actualizaciones.
"""
import os, re, sys, json, base64, shutil, subprocess, argparse

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
IMG = os.path.join(SRC, 'img')
MEDIA_MODULE = 'data/media.js'
RELEASE_MODULE = 'data/release.js'
CHANGELOG = os.path.join(ROOT, 'CHANGELOG.md')
USER_SECTIONS = ('Novedades', 'Mejoras', 'Correcciones')  # apartados que la app enseña al usuario


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
    out = []
    for l in read(os.path.join(SRC, 'js', 'modules.txt')).splitlines():
        l = l.strip()
        if l and not l.startswith('#'):
            out.append(l)
    return out


def check_tree(mods):
    seen = set()
    for m in mods:
        if m in seen:
            die('módulo repetido en modules.txt: ' + m)
        seen.add(m)
        if not os.path.isfile(os.path.join(SRC, 'js', m)):
            die('falta el módulo listado: ' + m)
    for dp, _, fs in os.walk(os.path.join(SRC, 'js')):
        for f in fs:
            if f.endswith('.js'):
                rel = os.path.relpath(os.path.join(dp, f), os.path.join(SRC, 'js')).replace(os.sep, '/')
                if rel not in seen:
                    die('módulo sin listar en modules.txt: ' + rel)
    if mods[-1] != 'core/boot.js':
        die('core/boot.js debe ser el último módulo (arranque)')
    if mods[0] != 'core/util.js':
        die('core/util.js debe ser el primero')
    for gm in (MEDIA_MODULE, RELEASE_MODULE):
        if gm not in seen:
            die('falta ' + gm + ' en modules.txt')


# ── fotos ──────────────────────────────────────────────────────────────────────────────────────────────────────────

def list_lines(p):
    return [l.split('#')[0].strip() for l in read(p).splitlines() if l.split('#')[0].strip()]


def media():
    """Lee src/img: portadas de día (order.txt) y fotos de ejercicio (map.txt). Devuelve la lista de fotos y los enlaces."""
    files, day, ex, ex_for, ex_alias = [], [], [], {}, {}
    for k in list_lines(os.path.join(IMG, 'day', 'order.txt')):
        p = os.path.join(IMG, 'day', k + '.jpg')
        if not os.path.isfile(p):
            die('falta la portada ' + p)
        day.append(k)
        files.append(('img/day/' + k + '.jpg', p))
    for n, l in enumerate(list_lines(os.path.join(IMG, 'ex', 'map.txt')), 1):
        parts = [x.strip() for x in l.split('|')]
        if len(parts) != 3 or not parts[0] or not parts[1]:
            die('src/img/ex/map.txt: formato «clave | ejercicios | otros nombres» (línea %d de datos)' % n)
        key, names, alts = parts[0], [x.strip() for x in parts[1].split(';') if x.strip()], [x.strip() for x in parts[2].split(';') if x.strip()]
        p = os.path.join(IMG, 'ex', key + '.webp')
        if not os.path.isfile(p):
            die('falta la foto ' + p)
        if key in ex:
            die('clave repetida en map.txt: ' + key)
        ex.append(key)
        files.append(('img/ex/' + key + '.webp', p))
        for nm in names:
            if nm in ex_for:
                die('el ejercicio «%s» tiene dos fotos en map.txt' % nm)
            ex_for[nm] = key
            if alts:
                ex_alias[nm] = ' '.join(alts)
    used = {os.path.basename(p) for _, p in files}
    for sub, ext in (('day', '.jpg'), ('ex', '.webp')):
        for f in sorted(os.listdir(os.path.join(IMG, sub))):
            if f.endswith(ext) and f not in used:
                print('  aviso: src/img/%s/%s no está en su lista y no se usa' % (sub, f))
    return {'files': files, 'day': day, 'ex': ex, 'exFor': ex_for, 'exAlias': ex_alias}


def media_js(m, inline):
    def url(rel, p):
        if not inline:
            return rel
        mime = 'image/jpeg' if p.endswith('.jpg') else 'image/webp'
        with open(p, 'rb') as f:
            return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode('ascii'))
    src = dict(m['files'])
    obj = {
        'day': {k: url('img/day/%s.jpg' % k, src['img/day/%s.jpg' % k]) for k in m['day']},
        'ex': {k: url('img/ex/%s.webp' % k, src['img/ex/%s.webp' % k]) for k in m['ex']},
        'exFor': m['exFor'],
        'exAlias': m['exAlias'],
    }
    return 'const MEDIA = ' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';'


# ── novedades (CHANGELOG.md) ────────────────────────────────────────────────────────────────────────────────────────

def plain(s):
    """Texto sin marcas de Markdown (**negrita**, `código`, [enlace](url))."""
    s = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', s)
    return re.sub(r'\*\*|__|`', '', s).strip()


def changelog():
    """Versiones de CHANGELOG.md, de la más nueva a la más antigua: [{version, date, sections: [{title, items}]}].
    Solo los apartados que ve el usuario; «Interno» y las entradas sin fecha se ignoran."""
    out, cur, sec = [], None, None
    for raw in read(CHANGELOG).splitlines():
        l = raw.rstrip()
        if l.startswith('## '):
            m = re.match(r'^## \[(\d+\.\d+\.\d+)\]\s*[—–-]\s*(\d{4}-\d{2}-\d{2})$', l)
            cur = {'version': m.group(1), 'date': m.group(2), 'sections': []} if m else None
            if cur:
                out.append(cur)
            sec = None
        elif cur is None:
            continue
        elif l.startswith('### '):
            title = l[4:].strip()
            sec = {'title': title, 'items': []} if title in USER_SECTIONS else None
            if sec:
                cur['sections'].append(sec)
        elif sec is not None and re.match(r'^[-*] ', l):
            sec['items'].append(plain(l[2:]))
        elif sec is not None and l.strip() and sec['items'] and raw.startswith('  '):
            sec['items'][-1] += ' ' + plain(l)
    for e in out:
        e['sections'] = [s for s in e['sections'] if s['items']]
    return out


def release_for(entries, ver):
    if not entries or entries[0]['version'] != ver:
        die('CHANGELOG.md debe empezar por la entrada de la versión %s («## [%s] — AAAA-MM-DD»)' % (ver, ver))
    if not entries[0]['sections']:
        die('la entrada %s de CHANGELOG.md no tiene Novedades, Mejoras ni Correcciones que enseñar' % ver)
    return entries[0]


def release_js(rel):
    return 'const RELEASE = ' + json.dumps(rel, ensure_ascii=False, separators=(',', ':')) + ';'


def version_json(entries):
    """version.json del paquete: la versión publicada con sus novedades y las de las anteriores (por si alguien salta varias)."""
    top = entries[0]
    return json.dumps({'version': top['version'], 'date': top['date'], 'sections': top['sections'], 'history': entries[:6]},
                      ensure_ascii=False, indent=1) + '\n'


# ── compilación ────────────────────────────────────────────────────────────────────────────────────────────────────

def compile_js(mods, generated):
    """Une los módulos. generated = {módulo molde: código que lo sustituye} (data/media, data/release)."""
    parts = []
    for m in mods:
        t = read(os.path.join(SRC, 'js', m))
        if m in generated:
            name = re.match(r'const (\w+)', generated[m]).group(1)
            head = re.match(r'\s*/\*.*?\*/\s*', t, re.S)
            n = len(re.findall(r'^const ' + name + r'\s*=', t, re.M))
            if not head or n != 1:
                die('%s debe tener su cabecera y una sola línea «const %s = …»' % (m, name))
            t = head.group(0) + generated[m] + '\n'
        if '</script' in t.lower():
            die('"</script" dentro de ' + m + ' rompería el HTML')
        parts.append(t.rstrip('\n'))
    return '\n'.join(parts) + '\n'


def compile_css():
    d = os.path.join(SRC, 'css')
    names = sorted(f for f in os.listdir(d) if f.endswith('.css'))
    css = ''.join(read(os.path.join(d, f)) for f in names)
    if '</style' in css.lower():
        die('"</style" dentro del CSS')
    return css


def app_version(js):
    m = re.search(r"const APPV\s*=\s*'([^']+)'", js)
    return m.group(1) if m else '?'


HEAD_TAGS = '''<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="StrataFit">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="theme-color" content="#0b0b0d">'''


def page(tpl, css, js):
    # replace con texto literal: el código puede contener barras invertidas
    return tpl.replace('@@CSS@@', css).replace('@@JS@@', js)


def deploy_variant(h):
    """Paquete instalable: FFDEP=1 (etiquetas fijas en la cabecera, aviso de versión nueva, sin recarga forzada)."""
    h, n = re.subn(r'const FFDEP\s*=\s*0\s*;', 'const FFDEP = 1;', h)
    if n != 1:
        die('variante app: la constante FFDEP aparece %d veces (esperada 1, en core/util)' % n)
    if h.count('<title>StrataFit</title>') != 1:
        die('variante app: falta <title>StrataFit</title> en la plantilla')
    return h.replace('<title>StrataFit</title>', '<title>StrataFit</title>\n' + HEAD_TAGS)


def service_worker(files):
    t = read(os.path.join(ROOT, 'static', 'sw.js'))
    if t.count('/*@@IMG@@*/') != 1:
        die('static/sw.js debe contener una vez el marcador /*@@IMG@@*/ dentro de la lista de precarga')
    return t.replace('/*@@IMG@@*/', ''.join(",'%s'" % rel for rel, _ in files))


def static_files():
    return {n: os.path.join(ROOT, 'static', n) for n in sorted(os.listdir(os.path.join(ROOT, 'static'))) if n != 'sw.js'}


def static_checks(js, html):
    """Comprobaciones baratas, sin dependencias externas."""
    if len(re.findall(r'window\.__ffok\s*=\s*1\s*;', js)) != 1:
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
    a = ap.parse_args()
    mods = module_list()
    check_tree(mods)
    m = media()
    entries = changelog()
    css = compile_css()
    tpl = read(os.path.join(SRC, 'index.html'))
    if tpl.count('@@CSS@@') != 1 or tpl.count('@@JS@@') != 1:
        die('la plantilla debe contener @@CSS@@ y @@JS@@ una vez cada uno')
    os.makedirs(DIST, exist_ok=True)
    ver = '?'
    if a.only != 'app':
        ver = app_version(read(os.path.join(SRC, 'js', 'core', 'util.js')))
        js = compile_js(mods, {MEDIA_MODULE: media_js(m, inline=True), RELEASE_MODULE: release_js(release_for(entries, ver))})
        html = page(tpl, css, js)
        static_checks(js, html)
        node_check(js, 'archivo único')
        write(os.path.join(DIST, 'stratafit.html'), html)
        print('  dist/stratafit.html  %d bytes (fotos incrustadas)' % len(html.encode('utf-8')))
    if a.only != 'single':
        ver = app_version(read(os.path.join(SRC, 'js', 'core', 'util.js')))
        js = compile_js(mods, {MEDIA_MODULE: media_js(m, inline=False), RELEASE_MODULE: release_js(release_for(entries, ver))})
        html = deploy_variant(page(tpl, css, js))
        static_checks(js, html)
        node_check(js, 'paquete')
        out = os.path.join(DIST, 'app')
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        write(os.path.join(out, 'index.html'), html)
        write(os.path.join(out, 'sw.js'), service_worker(m['files']))
        write(os.path.join(out, 'version.json'), version_json(entries))
        for n, p in static_files().items():
            shutil.copy(p, os.path.join(out, n))
        size = 0
        for rel, p in m['files']:
            os.makedirs(os.path.dirname(os.path.join(out, rel)), exist_ok=True)
            shutil.copy(p, os.path.join(out, rel))
            size += os.path.getsize(p)
        print('  dist/app/            index.html %d bytes + sw.js, version.json, manifiesto e iconos + %d fotos en img/ (%d KB)' % (
            os.path.getsize(os.path.join(out, 'index.html')), len(m['files']), size // 1024))
    print('StrataFit %s · %d módulos JS · %d trozos CSS · %d portadas y %d fotos de ejercicio' % (
        ver, len(mods), len([f for f in os.listdir(os.path.join(SRC, 'css')) if f.endswith('.css')]), len(m['day']), len(m['ex'])))
    if a.check:
        tool = os.path.join(ROOT, 'tools', 'check.js')
        if not os.path.isfile(tool):
            die('falta tools/check.js')
        r = subprocess.run(['node', tool], cwd=ROOT)
        if r.returncode:
            sys.exit(r.returncode)


if __name__ == '__main__':
    main()
