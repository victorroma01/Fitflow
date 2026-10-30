#!/usr/bin/env python3
"""Copia de la app en la raíz del repositorio, según desde dónde publica GitHub Pages (Settings → Pages → Source):
  · «Deploy from a branch» (modo legacy): GitHub Pages sirve los archivos de la raíz de main, así que la raíz tiene que llevar
    la app compilada (dist/app) y ser exactamente lo que sale de este código.
  · «GitHub Actions» (modo workflow): la CI compila y publica dist/app sola; la copia de la raíz sobra y se puede quitar.

  python3 tools/pages.py copiar            copia dist/app a la raíz y quita de js/ e img/ lo que ya no está en dist/app
  python3 tools/pages.py comprobar MODO    MODO = legacy | workflow | otro (lo que diga la API de GitHub Pages).
                                           Con legacy falla si la copia falta o no coincide con dist/app; con workflow
                                           avisa de que la copia sobra; con otro valor solo informa.
Necesita dist/app compilado (python3 build.py). En GitHub Actions los avisos salen como anotaciones.
"""
import os, sys, shutil, filecmp

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'dist', 'app')
# carpetas de la copia en las que lo que no está en dist/app sobra (código de versiones anteriores, fotos quitadas)
DIRS = ('js', 'img')
CI = bool(os.environ.get('GITHUB_ACTIONS'))


def say(level, msg):
    """Aviso: anotación en GitHub Actions (notice / error), texto normal fuera."""
    print('::%s title=GitHub Pages::%s' % (level, msg) if CI else ('ERROR: ' if level == 'error' else '') + msg)


def app_files():
    out = []
    for d, _, fs in os.walk(APP):
        out += [os.path.relpath(os.path.join(d, f), APP).replace(os.sep, '/') for f in fs]
    return sorted(out)


def stale():
    """Archivos de js/ e img/ en la raíz que ya no están en dist/app."""
    have = set(app_files())
    out = []
    for top in DIRS:
        for d, _, fs in os.walk(os.path.join(ROOT, top)):
            out += [r for r in (os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/') for f in fs) if r not in have]
    return sorted(out)


def differences():
    """(faltan o son distintos, sobran) entre la copia de la raíz y dist/app."""
    bad = [f for f in app_files() if not os.path.isfile(os.path.join(ROOT, f)) or not filecmp.cmp(os.path.join(APP, f), os.path.join(ROOT, f), shallow=False)]
    return bad, stale()


def main(args):
    if not os.path.isfile(os.path.join(APP, 'index.html')):
        say('error', 'falta dist/app: compila antes con python3 build.py')
        return 1
    if args[:1] == ['copiar']:
        bad, extra = differences()
        for f in bad:
            os.makedirs(os.path.dirname(os.path.join(ROOT, f)) or ROOT, exist_ok=True)
            shutil.copyfile(os.path.join(APP, f), os.path.join(ROOT, f))
        for f in extra:
            os.remove(os.path.join(ROOT, f))
        print('copia de dist/app en la raíz: %d archivos actualizados, %d quitados' % (len(bad), len(extra)))
        return 0
    if args[:1] == ['comprobar'] and len(args) == 2:
        mode = args[1]
        has_copy = os.path.isfile(os.path.join(ROOT, 'index.html'))
        if mode == 'legacy':
            say('notice', 'GitHub Pages publica desde la rama (modo legacy): la app publicada es la copia de la raíz. '
                          'Para que la publique la CI, elige «GitHub Actions» en Settings → Pages → Source.')
            if not has_copy:
                say('error', 'la raíz no tiene la app (index.html): GitHub Pages dejaría de publicarla. Restaura la copia con '
                             'python3 tools/pages.py copiar o publica desde GitHub Actions.')
                return 1
            bad, extra = differences()
            if bad or extra:
                say('error', 'la copia de la raíz no es la app que sale de este código (%d archivos distintos o que faltan, %d que '
                             'sobran: %s). Actualízala con python3 tools/pages.py copiar.' % (len(bad), len(extra), ', '.join((bad + extra)[:6])))
                return 1
            print('la copia de la raíz coincide con dist/app (%d archivos)' % len(app_files()))
            return 0
        if mode == 'workflow':
            say('notice', 'GitHub Pages publica desde GitHub Actions (modo workflow): la CI publica dist/app al llegar a main.' +
                (' La copia de la raíz (index.html, sw.js, version.json, manifest.webmanifest, iconos, js/ e img/) ya no hace falta.' if has_copy else ''))
            return 0
        say('notice', 'no se ha podido saber desde dónde publica GitHub Pages (%s)' % mode)
        return 0
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
