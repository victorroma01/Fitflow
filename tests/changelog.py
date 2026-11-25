"""Prueba de cómo `build.py` lee CHANGELOG.md y compone las tarjetas de versión que enseña la app (el aviso de versión
nueva, las novedades y Ajustes), sin navegador: las entradas normales, las revisiones de una versión (con una cuarta cifra,
1.1.0.1 de la 1.1.0, o diciéndolo, 1.0.31 de la 1.0.3), la cabecera de una versión, lo que leen de version.json las apps
instaladas hasta la 1.0.31, lo que no se admite y el historial de verdad.

  python3 tests/changelog.py
"""
import io, os, sys, json, contextlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import build  # noqa: E402

fails = []


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def parsed(text):
    """Las entradas y las tarjetas de un historial escrito aquí; si la compilación se detendría, su mensaje."""
    real = build.read
    build.read = lambda path: text if path == build.CHANGELOG else real(path)
    try:
        err = io.StringIO()
        with contextlib.redirect_stderr(err), contextlib.redirect_stdout(err):
            try:
                entries = build.changelog()
                return entries, build.cards(entries), ''
            except SystemExit:
                return None, None, err.getvalue() or 'se detiene'
    finally:
        build.read = real


def titles(card):
    return [s['title'] for s in card['sections']]


PLAIN = """# Historial

## [1.1.0] — 2026-12-01

### Novedades
- Una cosa nueva, con `código` y **negrita**,
  en dos líneas.

### Interno
- Esto no se enseña.

## [1.0.3] — 2026-11-16

### Novedades
- La novedad de la 1.0.3.

### Mejoras
- Una mejora.
- Otra mejora.

### Correcciones
- Un arreglo de la 1.0.3.

## [1.0.2] — 2026-11-12

### Mejoras
- Lo de la 1.0.2.
"""
REVISION = PLAIN.replace('## [1.1.0] — 2026-12-01\n', """## [1.0.31] — 2026-11-16

Revisión de la [1.0.3]: arregla lo que salió al probarla.

### Correcciones
- Remo: va seguido.
- Comba: la cuerda da la vuelta.
""").replace("""### Novedades
- Una cosa nueva, con `código` y **negrita**,
  en dos líneas.

### Interno
- Esto no se enseña.
""", """### Interno
- Esto no se enseña.
""")
SECOND = REVISION.replace('## [1.0.31] — 2026-11-16\n', """## [1.0.32] — 2026-11-20

Revisión de la [1.0.3].

### Mejoras
- Otra cosa pulida.

## [1.0.31] — 2026-11-16
""")


FOURTH = PLAIN.replace('## [1.1.0] — 2026-12-01\n', """## [1.1.0.2] — 2026-12-09

### Correcciones
- Otro arreglo.

## [1.1.0.1] — 2026-12-05

### Correcciones
- Un arreglo de la 1.1.0.

## [1.1.0] — 2026-12-01
""")


def main():
    print('Entradas normales')
    entries, cards, err = parsed(PLAIN)
    check('lee las versiones, de la más nueva a la más antigua, con su fecha', entries and [e['version'] for e in entries] == ['1.1.0', '1.0.3', '1.0.2'] and entries[0]['date'] == '2026-12-01', str(err or entries))
    check('solo los apartados que ve el usuario, sin marcas de Markdown y con las líneas que siguen', entries and titles(entries[0]) == ['Novedades'] and entries[0]['sections'][0]['items'] == ['Una cosa nueva, con código y negrita, en dos líneas.'], str(entries and entries[0]))
    check('sin revisiones, cada versión tiene su tarjeta, tal cual', cards == [{'version': e['version'], 'date': e['date'], 'sections': e['sections']} for e in entries], str(cards))

    print('Una revisión')
    entries, cards, err = parsed(REVISION)
    check('la revisión dice qué versión revisa', entries and entries[0].get('base') == '1.0.3' and not any('base' in e for e in entries[1:]), str(err or entries))
    card = cards[0] if cards else {'sections': []}
    check('su tarjeta lleva su número y su fecha', cards and card['version'] == '1.0.31' and card['date'] == '2026-11-16')
    check('primero lo que arregla la revisión y después lo de la versión que revisa, cada apartado con el número de la suya', titles(card) == ['Correcciones de la 1.0.31', 'Novedades de la 1.0.3', 'Mejoras de la 1.0.3', 'Correcciones de la 1.0.3'], str(titles(card)))
    check('con todos sus cambios, sin mezclarlos', [len(s['items']) for s in card['sections']] == [2, 1, 2, 1] and card['sections'][0]['items'][0] == 'Remo: va seguido.' and card['sections'][3]['items'] == ['Un arreglo de la 1.0.3.'], str(card))
    check('la versión revisada ya no sale aparte, y las anteriores siguen como estaban', cards and [c['version'] for c in cards] == ['1.0.31', '1.0.2'] and titles(cards[1]) == ['Mejoras'], str(cards and [c['version'] for c in cards]))
    vj = json.loads(build.version_json(cards)) if cards else {}
    check('version.json: la tarjeta de la revisión arriba y en la lista de versiones, que no repite la revisada', vj.get('number') == vj.get('version') == '1.0.31' and vj.get('sections') == card['sections'] and [h['version'] for h in vj.get('history', [])] == ['1.0.31', '1.0.2'], str(vj)[:200])
    check('las entradas leídas no cambian al componer las tarjetas', entries and titles(entries[0]) == ['Correcciones'] and titles(entries[1]) == ['Novedades', 'Mejoras', 'Correcciones'])

    print('Otra revisión de la misma versión')
    entries, cards, err = parsed(SECOND)
    card = cards[0] if cards else {'sections': []}
    check('lleva lo suyo, lo de la revisión anterior y lo de la versión, en ese orden', titles(card) == ['Mejoras de la 1.0.32', 'Correcciones de la 1.0.31', 'Novedades de la 1.0.3', 'Mejoras de la 1.0.3', 'Correcciones de la 1.0.3'], str(err or titles(card)))
    check('y ni la revisión anterior ni la versión salen aparte', cards and [c['version'] for c in cards] == ['1.0.32', '1.0.2'], str(cards and [c['version'] for c in cards]))

    print('Revisiones con una cuarta cifra')
    entries, cards, err = parsed(FOURTH)
    check('una versión de cuatro cifras es la revisión de la de sus tres primeras, sin decirlo', entries and [e.get('base') for e in entries] == ['1.1.0', '1.1.0', None, None, None], str(err or [(e['version'], e.get('base')) for e in entries]))
    card = cards[0] if cards else {'sections': []}
    check('su tarjeta: lo suyo, lo de la revisión anterior y lo de la versión', titles(card) == ['Correcciones de la 1.1.0.2', 'Correcciones de la 1.1.0.1', 'Novedades de la 1.1.0'], str(titles(card)))
    check('y la lista de versiones: la revisión, y después las versiones anteriores', cards and [c['version'] for c in cards] == ['1.1.0.2', '1.0.3', '1.0.2'], str(cards and [c['version'] for c in cards]))
    _, cards, err = parsed(FOURTH.replace('## [1.1.0] — 2026-12-01', '## [1.1.0] — sin fecha'))
    check('una revisión de cuatro cifras sin su versión debajo detiene la compilación', cards is None and '1.1.0' in err, err[:160])
    entries, _, err = parsed(FOURTH.replace('## [1.1.0.1] — 2026-12-05\n', '## [1.1.0.1] — 2026-12-05\n\nRevisión de la [1.1.0]: un arreglo.\n'))
    check('puede decir además cuál revisa, si es la de su número', entries is not None and entries[1].get('base') == '1.1.0', str(err))
    entries, _, err = parsed(FOURTH.replace('## [1.1.0.1] — 2026-12-05\n', '## [1.1.0.1] — 2026-12-05\n\nRevisión de la [1.0.3]: un arreglo.\n'))
    check('y no puede decir que revisa otra', entries is None and '1.1.0.1' in err and '1.0.3' in err, err[:160])

    print('Lo que no se admite')
    _, cards, err = parsed(REVISION.replace('Revisión de la [1.0.3]', 'Revisión de la [1.0.9]'))
    check('una revisión de una versión que no está más abajo detiene la compilación', cards is None and '1.0.9' in err, err[:160])
    _, cards, err = parsed(REVISION.replace('Revisión de la [1.0.3]', 'Revisión de la [1.0.2]'))
    check('y también si entre ella y la que revisa hay una versión que no es otra revisión suya', cards is None and '1.0.3' in err, err[:160])
    entries, cards, err = parsed(PLAIN.replace('- La novedad de la 1.0.3.', '- La novedad de la 1.0.3.\nRevisión de la [1.0.2] no es más que texto aquí.'))
    check('la frase solo cuenta antes del primer apartado de la entrada', entries and not any('base' in e for e in entries) and [c['version'] for c in cards] == ['1.1.0', '1.0.3', '1.0.2'], str(err or entries))
    entries, cards, err = parsed(PLAIN.replace('## [1.0.3] — 2026-11-16', '## [1.0.3] — sin fecha'))
    check('una entrada sin fecha no cuenta (ni lo que lleva dentro)', entries and [e['version'] for e in entries] == ['1.1.0', '1.0.2'], str(err or entries))

    print('La cabecera de una versión')
    LEAD = PLAIN.replace('## [1.1.0] — 2026-12-01\n', '## [1.1.0] — 2026-12-01\n\n> Un título **grande**\n>\n> Lo que cuenta, en una frase\n> que sigue en otra línea.\n')
    entries, cards, err = parsed(LEAD)
    first = entries[0]['sections'][0] if entries else {}
    check('las líneas «> » de antes del primer apartado: la primera, el título; las demás, su texto', first == {'title': 'Un título grande', 'items': ['Lo que cuenta, en una frase que sigue en otra línea.'], 'lead': True}, str(err or first))
    check('es el primer apartado de la versión, marcado, y los demás siguen igual', entries and titles(entries[0]) == ['Un título grande', 'Novedades'] and not any(s.get('lead') for s in entries[0]['sections'][1:]) and cards[0]['sections'] == entries[0]['sections'], str(err or entries and titles(entries[0])))
    entries, cards, err = parsed(PLAIN.replace('- Una cosa nueva', '> Esto no es una cabecera.\n- Una cosa nueva'))
    check('solo cuentan antes del primer apartado', entries and not any(s.get('lead') for e in entries for s in e['sections']), str(err or entries))
    real = build.read
    build.read = lambda path: LEAD.replace('### Novedades', '### Interno', 1) if path == build.CHANGELOG else real(path)
    try:
        with contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
            try:
                build.release_for(build.cards(build.changelog()), '1.1.0')
                stopped = False
            except SystemExit:
                stopped = True
    finally:
        build.read = real
    check('una versión con cabecera y sin Novedades, Mejoras ni Correcciones detiene la compilación', stopped)
    entries, cards, err = parsed(REVISION.replace('## [1.0.3] — 2026-11-16\n', '## [1.0.3] — 2026-11-16\n\n> La cabecera de la 1.0.3\n> Su texto.\n'))
    card = cards[0] if cards else {'sections': []}
    check('la tarjeta de una revisión lleva delante la cabecera de la versión que revisa, sin apellido', titles(card)[:2] == ['La cabecera de la 1.0.3', 'Correcciones de la 1.0.31'] and card['sections'][0].get('lead') and sum(1 for s in card['sections'] if s.get('lead')) == 1, str(err or titles(card)))

    print('version.json y las apps instaladas hasta la 1.0.31')
    # su aviso solo compara tres cifras (old_newer es su comparador): la 1.0.4 no sería posterior a la 1.0.31
    check('para una 1.0.31 instalada, «1.0.4» no es posterior a la suya; para una 1.0.3, sí', not build.old_newer('1.0.4', '1.0.31') and build.old_newer('1.0.4', '1.0.3'))
    for v, d, text in [('1.0.4', '2026-11-25', '1.0.4 de nov. 2026'), ('1.0.4.1', '2026-12-03', '1.0.4.1 de dic. 2026'), ('1.0.30', '2027-09-01', '1.0.30 de sept. 2027')]:
        s = build.legacy_version(v, d)
        shown = s.replace(build.DOT, '.').replace('\u00a0', ' ')
        check('la %s se escribe para ellas «%s»: se lee igual y es posterior a la 1.0.31, la 1.0.3 y la 1.0.2' % (v, text), shown == text and all(build.old_newer(s, x) for x in ('1.0.31', '1.0.3', '1.0.2', '1.0.0')) and s.split(' ')[0].replace(build.DOT, '.') == v, repr(s))
    check('una versión que ya es posterior para ellas va tal cual (la 1.0.32, la 1.1.0), y las publicadas hasta la 1.0.31 también',
          [build.legacy_version(v, '2027-01-01') for v in ('1.0.32', '1.1.0', '2.0.0', '1.0.31', '1.0.3', '1.0.2')] == ['1.0.32', '1.1.0', '2.0.0', '1.0.31', '1.0.3', '1.0.2'])
    entries, cards, err = parsed(PLAIN.replace('## [1.1.0] — 2026-12-01', '## [1.0.4] — 2026-11-25'))
    vj = json.loads(build.version_json(cards)) if cards else {}
    check('version.json: `number` es la versión y `version`, lo que leen esas apps; las de la lista, su número', vj.get('number') == '1.0.4' and vj.get('version') == build.legacy_version('1.0.4', '2026-11-25') != '1.0.4' and [h['version'] for h in vj.get('history', [])] == ['1.0.4', '1.0.3', '1.0.2'], str(err or vj)[:200])
    # esas apps enseñan los apartados de la lista que son posteriores a la suya y, si no hay ninguno (la 1.0.31), los de arriba
    check('y los apartados de arriba son los de la versión', vj.get('sections') == vj.get('history', [{}])[0].get('sections'))

    print('El historial de verdad')
    ver = build.app_version(build.read(os.path.join(build.SRC, 'js', 'core', 'util.js')))
    entries = build.changelog()
    cards = build.cards(entries)
    check('empieza por la versión de la app (%s) y su tarjeta tiene algo que enseñar' % ver, cards[0]['version'] == ver == entries[0]['version'] and build.release_for(cards, ver)['sections'])
    versions = [c['version'] for c in cards]
    check('ninguna versión sale dos veces en la lista', len(set(versions)) == len(versions), str(versions))
    newer = lambda a, b: build.version_key(a) > build.version_key(b)
    check('cada versión es posterior a la que tiene debajo, como las compara el aviso (número a número; la 1.0.31, como 1.0.3.1)', all(newer(a['version'], b['version']) for a, b in zip(entries, entries[1:])), str([e['version'] for e in entries][:6]))
    vj = json.loads(build.version_json(cards))
    check('version.json: su versión (%s) y lo que leen de ella las apps instaladas hasta la 1.0.31, para las que es posterior' % ver, vj['number'] == ver and build.old_newer(vj['version'], build.LAST_OLD) and vj['version'].split(' ')[0].replace(build.DOT, '.') == ver, vj['version'])
    lead = [s for s in cards[0]['sections'] if s.get('lead')]
    if lead:
        check('su cabecera va la primera, con título y texto, y cabe en el aviso', cards[0]['sections'][0] is lead[0] and len(lead) == 1 and lead[0]['title'] and 1 <= len(lead[0]['items']) <= 8, str(lead))
    # el aviso de versión nueva enseña ocho cambios por apartado
    check('cada apartado cabe entero en el aviso (ocho cambios)', all(len(x['items']) <= 8 for x in cards[0]['sections']), str([len(x['items']) for x in cards[0]['sections']]))
    base = entries[0].get('base')
    if base:
        t = titles(cards[0])
        own = [x['title'] + ' de la ' + ver for x in entries[0]['sections']]
        check('%s es una revisión de la %s: su tarjeta enseña primero lo suyo y después lo de esa versión, que ya no sale aparte' % (ver, base), t[:len(own)] == own and t[-1].endswith(' de la ' + base) and base not in versions, str(t) + ' ' + str(versions[:4]))
        earlier = [e['version'] for e in entries[1:] if e.get('base') == base]
        check('ni sus revisiones anteriores (%s), que van en la misma tarjeta' % (', '.join(earlier) or 'ninguna'), all(v not in versions and any(x.endswith(' de la ' + v) for x in t) for v in earlier), str(t))
        # el aviso de versión nueva enseña ocho cambios por apartado: lo que arregla la revisión tiene que verse entero
        check('lo que arregla la revisión cabe entero en el aviso (ocho cambios por apartado)', all(len(x['items']) <= 8 for x in entries[0]['sections']), str([len(x['items']) for x in entries[0]['sections']]))
    print()
    if fails:
        print('FALLAN:', ', '.join(fails))
        sys.exit(1)
    print('TODO CORRECTO')


if __name__ == '__main__':
    main()
