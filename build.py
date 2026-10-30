#!/usr/bin/env python3
"""StrataFit · build

Compila src/ en la app. Necesita Python 3 y esbuild («npm install»), que une los módulos ES y comprime el código.

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
                          con lo poco usado en archivos aparte que se cargan al usarlo (paquete)
  src/js/data/media.js    molde que el build sustituye por las fotos de src/img/ (rutas o base64 según la variante)
  src/js/data/release.js  molde que el build sustituye por las novedades de la versión actual (de CHANGELOG.md)
  CHANGELOG.md            historial de versiones: la entrada de APPV es obligatoria; de aquí salen las novedades y version.json
  src/img/day/            portadas de los días (.jpg) y order.txt
  src/img/ex/             fotos de ejercicio (.webp) y map.txt
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
    return 'export const MEDIA = ' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';'


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


def release_notes(ver):
    """Texto Markdown de la entrada de `ver` en CHANGELOG.md (todos sus apartados), para la publicación en GitHub."""
    m = re.search(r'^## \[' + re.escape(ver) + r'\][^\n]*\n(.*?)(?=^## |\Z)', read(CHANGELOG), re.S | re.M)
    if not m:
        die('CHANGELOG.md no tiene la entrada %s' % ver)
    return m.group(1).strip() + '\n'


def release_js(rel):
    return 'export const RELEASE = ' + json.dumps(rel, ensure_ascii=False, separators=(',', ':')) + ';'


def version_json(entries):
    """version.json del paquete: la versión publicada con sus novedades y las de las anteriores (por si alguien salta varias)."""
    top = entries[0]
    return json.dumps({'version': top['version'], 'date': top['date'], 'sections': top['sections'], 'history': entries[:6]},
                      ensure_ascii=False, indent=1) + '\n'


# ── compilación ────────────────────────────────────────────────────────────────────────────────────────────────────

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


def stage(generated, deploy):
    """Copia src/js a una carpeta temporal con los moldes generados (data/media, data/release) y, en el paquete, FFDEP = 1."""
    # siempre la misma carpeta: esbuild tiene en cuenta las rutas al calcular los nombres de los archivos, y así salen iguales
    st = os.path.join(DIST, '.stage')
    shutil.rmtree(st, ignore_errors=True)
    shutil.copytree(os.path.join(SRC, 'js'), st)
    for m, code in generated.items():
        p = os.path.join(st, m)
        t = read(p)
        name = re.match(r'export const (\w+)', code).group(1)
        head = re.match(r'\s*/\*.*?\*/\s*', t, re.S)
        if not head or len(re.findall(r'^export const ' + name + r'\s*=', t, re.M)) != 1:
            die('%s debe tener su cabecera y una sola línea «export const %s = …»' % (m, name))
        write(p, head.group(0) + code + '\n')
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
    entry = next(p for p, o in outs.items() if o.get('entryPoint'))
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
<link rel="icon" type="image/png" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="StrataFit">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="theme-color" content="#0b0b0d" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f3f3f7" media="(prefers-color-scheme: light)">'''
# theme-color: el color de la barra del sistema sigue al tema del móvil (el primero cuyo media encaja); si el tema se elige
# a mano en Ajustes, core/state applyTheme() pone delante otra etiqueta sin media con el color de ese tema


# Política de seguridad del contenido (CSP), en una etiqueta <meta> (GitHub Pages no deja poner cabeceras): solo se ejecuta
# el código de la app (sus archivos de la propia web y los <script> de la plantilla, reconocidos por su huella sha256); nada
# de atributos on…=, eval ni código de otros sitios. Las conexiones van solo a la propia web y a Open Food Facts, y las
# imágenes solo pueden ser propias, data: o blob: (así un dato inyectado tampoco puede sacar información con una imagen
# de otro sitio). frame-ancestors, sandbox y report-uri no valen en <meta>: no se ponen.
CSP_CONNECT = 'https://world.openfoodfacts.org https://search.openfoodfacts.org'


def template_scripts(tpl):
    """Texto de los <script> de la plantilla (todos sin atributos), con el del código (@@JS@@) incluido."""
    s = re.findall(r'<script>(.*?)</script>', tpl, re.S)
    if len(s) != tpl.count('<script') or s.count('\n@@JS@@') != 1:
        die('la plantilla solo puede tener <script> sin atributos, y uno de ellos con salto + @@JS@@ dentro')
    return s


def csp_meta(scripts, files):
    """<meta> con la CSP: la huella de cada <script> en línea (`scripts`, su texto exacto) y, con `files`, el código de la web."""
    if any('\r' in s or '\0' in s for s in scripts):
        # el navegador los cambia al leer la página (\r\n → \n): la huella ya no coincidiría y el <script> no se ejecutaría
        die('\\r o \\0 dentro de un <script>')
    sha = ["'sha256-%s'" % base64.b64encode(hashlib.sha256(s.encode('utf-8')).digest()).decode() for s in scripts]
    pol = ["default-src 'self'", ' '.join(['script-src'] + (["'self'"] if files else []) + sha), "style-src 'self' 'unsafe-inline'",
           "img-src 'self' data: blob:", "media-src 'self' data: blob:", "font-src 'self' data:", "connect-src 'self' " + CSP_CONNECT,
           "worker-src 'self'", "manifest-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]
    return '<meta http-equiv="Content-Security-Policy" content="%s">' % '; '.join(pol)


def page(tpl, css, js):
    """Archivo único: todo en línea, con la CSP que admite justo sus dos <script> (el de arranque y el código)."""
    sc = ['\n' + js if s == '\n@@JS@@' else s for s in template_scripts(tpl)]
    h = tpl.replace('<title>StrataFit</title>', '<title>StrataFit</title>\n' + csp_meta(sc, False), 1)
    # replace con texto literal: el código puede contener barras invertidas
    return h.replace('@@CSS@@', css).replace('@@JS@@', js)


def deploy_page(tpl, css, entry, eager):
    """index.html del paquete: CSP y etiquetas fijas en la cabecera (manifiesto, icono…), precarga de los módulos del arranque y
    el módulo de entrada (si no carga, la pantalla de error lo dice al momento)."""
    if tpl.count('<title>StrataFit</title>') != 1 or tpl.count('<script>\n@@JS@@</script>') != 1:
        die('la plantilla debe tener <title>StrataFit</title> y «<script>» + salto + @@JS@@ + «</script>»')
    pre = ''.join('\n<link rel="modulepreload" href="%s">' % f for f in [entry] + eager)
    sc = [s for s in template_scripts(tpl) if s != '\n@@JS@@']
    h = tpl.replace('<title>StrataFit</title>', '<title>StrataFit</title>\n' + csp_meta(sc, True) + '\n' + HEAD_TAGS + pre)
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
    entries = changelog()
    css = compile_css()
    tpl = read(os.path.join(SRC, 'index.html'))
    if tpl.count('@@CSS@@') != 1 or tpl.count('@@JS@@') != 1:
        die('la plantilla debe contener @@CSS@@ y @@JS@@ una vez cada uno')
    os.makedirs(DIST, exist_ok=True)
    ver = app_version(read(os.path.join(SRC, 'js', 'core', 'util.js')))
    rel_js = release_js(release_for(entries, ver))
    if a.only != 'app':
        st = stage({MEDIA_MODULE: media_js(m, inline=True), RELEASE_MODULE: rel_js}, deploy=False)
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
        st = stage({MEDIA_MODULE: media_js(m, inline=False), RELEASE_MODULE: rel_js}, deploy=True)
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
        size = 0
        for rel, p in m['files']:
            os.makedirs(os.path.dirname(os.path.join(out, rel)), exist_ok=True)
            shutil.copy(p, os.path.join(out, rel))
            size += os.path.getsize(p)
        start = sum(os.path.getsize(os.path.join(out, f)) for f in [entry] + eager)
        later = sum(os.path.getsize(os.path.join(out, f)) for f in js_files) - start
        print('  dist/app/            index.html %d bytes + js/ (%d KB al arrancar, %d KB al usarlo, %d archivos) + sw.js, version.json, manifiesto e iconos + %d fotos en img/ (%d KB)' % (
            os.path.getsize(os.path.join(out, 'index.html')), start // 1024, later // 1024, len(js_files), len(m['files']), size // 1024))
    print('StrataFit %s · %d módulos JS (%d al usarlos) · %d trozos CSS · %d portadas y %d fotos de ejercicio' % (
        ver, len(mods) + len(lazy_modules()), len(lazy_modules()), len([f for f in os.listdir(os.path.join(SRC, 'css')) if f.endswith('.css')]), len(m['day']), len(m['ex'])))
    if a.check:
        tool = os.path.join(ROOT, 'tools', 'check.js')
        if not os.path.isfile(tool):
            die('falta tools/check.js')
        r = subprocess.run(['node', tool], cwd=ROOT)
        if r.returncode:
            sys.exit(r.returncode)


if __name__ == '__main__':
    main()
