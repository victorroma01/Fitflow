#!/usr/bin/env python3
"""StrataFit · build

Compila src/ en un único index.html (sin dependencias, solo Python 3).

  python3 build.py                 → dist/app/  (index.html + sw.js + manifiesto + iconos, listo para GitHub Pages)
                                     dist/stratafit.html  (versión de un solo archivo, sin service worker)
  python3 build.py --check         → además ejecuta comprobaciones estáticas (necesita node)
  python3 build.py --only app      → solo el paquete de despliegue
  python3 build.py --only single   → solo el archivo único

Estructura (todo el código vive en src/):
  src/index.html          plantilla (@@CSS@@ y @@JS@@ se sustituyen al compilar)
  src/css/NN-nombre.css   trozos de CSS contiguos; se concatenan por orden alfabético (el orden importa por la cascada)
  src/js/modules.txt      orden de carga de los módulos JS (el orden importa: ver README)
  src/js/<area>/<m>.js    módulos: listas de sentencias de ámbito global; el build las une en un solo <script>
  static/                 sw.js, manifest.webmanifest e iconos
"""
import os, re, sys, json, shutil, subprocess, argparse

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')


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


def compile_js(mods):
    parts = []
    for m in mods:
        t = read(os.path.join(SRC, 'js', m))
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
    m = re.search(r"const APPV='([^']+)'", js)
    return m.group(1) if m else '?'


HEAD_TAGS = '''<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="StrataFit">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="theme-color" content="#0b0b0d">'''


def deploy_variant(h):
    """Paquete instalable: etiquetas fijas en la cabecera, aviso de versión nueva y arranque rápido."""
    def rep(old, new, count=1, label=''):
        nonlocal h
        n = h.count(old)
        if n != count:
            die('variante app: "%s" aparece %d veces (esperadas %d)' % (label or old[:50], n, count))
        h = h.replace(old, new)
    rep("hd.appendChild(e);return e}", "return e}", 1, 'mk detached')
    rep("<title>StrataFit</title>", "<title>StrataFit</title>\n" + HEAD_TAGS, 1, 'head')
    rep("let ffDeploy=0,", "let ffDeploy=1,", 1, 'ffDeploy')
    rep("FFSW=1;navigator.serviceWorker.ready.then(()=>{try{fetch(location.href,{cache:'reload'}).catch(()=>{})}catch(e){}}).catch(()=>{})", "FFSW=1", 1, 'sin recarga forzada')
    rep(" im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ffIcoSvg);", "", 1, 'sin icono runtime')
    return h


def static_manifest():
    return {n: os.path.join(ROOT, 'static', n) for n in sorted(os.listdir(os.path.join(ROOT, 'static')))}


def static_checks(js, html):
    """Comprobaciones baratas, sin dependencias externas."""
    if js.count('window.__ffok=1;') != 1:
        die('no se encuentra la marca de arranque correcto (window.__ffok)')
    if not html.rstrip().endswith('</html>'):
        die('HTML incompleto')


def node_check(js):
    node = shutil.which('node')
    if not node:
        print('  (node no disponible: se omite la comprobación de sintaxis)')
        return
    tmp = os.path.join(DIST, '_check.js')
    write(tmp, js)
    r = subprocess.run([node, '--check', tmp], capture_output=True, text=True)
    os.remove(tmp)
    if r.returncode:
        die('error de sintaxis en el JS compilado:\n' + r.stderr)
    print('  sintaxis JS correcta (node --check)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='comprobaciones estáticas adicionales (tools/check.js, necesita node + typescript)')
    ap.add_argument('--only', choices=['app', 'single'])
    a = ap.parse_args()
    mods = module_list()
    check_tree(mods)
    js = compile_js(mods)
    css = compile_css()
    tpl = read(os.path.join(SRC, 'index.html'))
    if tpl.count('@@CSS@@') != 1 or tpl.count('@@JS@@') != 1:
        die('la plantilla debe contener @@CSS@@ y @@JS@@ una vez cada uno')
    # las funciones de sustitución evitan que re interprete barras invertidas del código
    html = tpl.replace('@@CSS@@', css).replace('@@JS@@', js)
    static_checks(js, html)
    ver = app_version(js)
    os.makedirs(DIST, exist_ok=True)
    node_check(js)
    if a.only != 'app':
        write(os.path.join(DIST, 'stratafit.html'), html)
        print('  dist/stratafit.html  %d bytes' % len(html.encode('utf-8')))
    if a.only != 'single':
        out = os.path.join(DIST, 'app')
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        write(os.path.join(out, 'index.html'), deploy_variant(html))
        for n, p in static_manifest().items():
            shutil.copy(p, os.path.join(out, n))
        print('  dist/app/            index.html %d bytes + %d archivos estáticos' % (os.path.getsize(os.path.join(out, 'index.html')), len(static_manifest())))
    print('StrataFit %s · %d módulos JS · %d trozos CSS' % (ver, len(mods), len([f for f in os.listdir(os.path.join(SRC, 'css')) if f.endswith('.css')])))
    if a.check:
        tool = os.path.join(ROOT, 'tools', 'check.js')
        if not os.path.isfile(tool):
            die('falta tools/check.js')
        r = subprocess.run(['node', tool], cwd=ROOT)
        if r.returncode:
            sys.exit(r.returncode)


if __name__ == '__main__':
    main()
