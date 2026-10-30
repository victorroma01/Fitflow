#!/usr/bin/env python3
"""StrataFit · genera src/js/data/exphotos.js a partir de src/img/ex/

  python3 tools/exphotos.py

Lee src/img/ex/map.txt (clave | ejercicios | nombres alternativos) y las fotos src/img/ex/<clave>.webp,
y escribe el módulo de datos con las fotos en base64 (EXPH), el enlace ejercicio → foto (EXPK) y los
nombres alternativos para buscar (EXAL). No edites exphotos.js a mano: se regenera con este script.
"""
import os, sys, json, base64

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'src', 'img', 'ex')
OUT = os.path.join(ROOT, 'src', 'js', 'data', 'exphotos.js')


def main():
    ph, pk, al, used = {}, {}, {}, set()
    with open(os.path.join(IMG, 'map.txt'), encoding='utf-8') as f:
        for n, l in enumerate(f, 1):
            l = l.strip()
            if not l or l.startswith('#'):
                continue
            parts = [p.strip() for p in l.split('|')]
            if len(parts) != 3 or not parts[0] or not parts[1]:
                sys.exit('map.txt línea %d: formato «clave|ejercicios|alternativos»' % n)
            key, names, alts = parts[0], [x.strip() for x in parts[1].split(';') if x.strip()], [x.strip() for x in parts[2].split(';') if x.strip()]
            p = os.path.join(IMG, key + '.webp')
            if not os.path.isfile(p):
                sys.exit('falta la foto ' + p)
            if key in ph:
                sys.exit('clave repetida en map.txt: ' + key)
            with open(p, 'rb') as g:
                ph[key] = base64.b64encode(g.read()).decode('ascii')
            used.add(key + '.webp')
            for nm in names:
                if nm in pk:
                    sys.exit('el ejercicio «%s» ya tiene otra foto' % nm)
                pk[nm] = key
                if alts:
                    al[nm] = ' '.join(alts)
    extra = [x for x in os.listdir(IMG) if x.endswith('.webp') and x not in used]
    if extra:
        print('aviso: fotos sin línea en map.txt:', ', '.join(sorted(extra)))
    j = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    js = ('/* ═══ data/exphotos ═══\n'
          '   Fotos de ejercicio (WebP en base64), enlace ejercicio → foto y nombres alternativos de búsqueda.\n'
          '   GENERADO por tools/exphotos.py desde src/img/ex/ (no editar a mano).\n'
          '   Define: EXPH, EXPK, EXAL\n'
          '*/\n'
          'const EXPH=' + j(ph) + ';\n'
          'const EXPK=' + j(pk) + ';\n'
          'const EXAL=' + j(al) + ';\n')
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js)
    print('%d fotos · %d ejercicios con foto · %d KB' % (len(ph), len(pk), len(js) // 1024))


main()
