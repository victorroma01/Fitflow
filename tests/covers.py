"""Prueba de las portadas de los días (data/photos, workout/images):

  · qué portada lleva cada día de los programas, por su nombre, con el perfil de hombre y con el de mujer (las de la modelo y,
    mientras falte alguna, la que la sustituye: la de competición, la del trineo);
  · los descansos: los de una semana con CrossFit, Hyrox o funcional llevan los suyos (descanso2), y los demás, los de siempre;
  · un día cuyo nombre no dice nada (Full Body) lleva la de su primer ejercicio; un workout personalizado, la elegida o la de sus
    ejercicios, y su selector enseña las del perfil;
  · las otras versiones de las portadas (tools/variantes.py): las del modelo con el perfil de hombre y las de la modelo con el de
    mujer, sin mezclar; un día lleva otra cada semana, y dos días con la misma portada en una semana, distintas (los dos de
    empuje, los descansos); siempre la misma al volver a pintar, y la del día es la de su Overview; en Entrenos a la carta, cada
    rutina la suya; y cada programa de Programas, su foto;
  · todas las fotos cargan y el paquete las guarda para abrir sin conexión;
  · el texto de la tarjeta del día se lee (AA) sobre cada portada, en las de hombre y en las de mujer (medido como en
    tests/contrast.py).

  python3 tests/covers.py dist/stratafit.html
"""
import os, re, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from browser import launch, app_url, context_opts  # noqa: E402
from contrast import measure  # noqa: E402
from shots import SEED, EXTRA, INIT  # noqa: E402

fails, passes = [], []
# lo que lleva cada día (de lunes a domingo) de los programas, con el nivel intermedio
WEEKS = {
    1: ['skierg', 'granjero', 'descanso2', 'thrusters', 'competencia', 'cardio', 'descanso2'],   # Hyrox / CrossFit
    4: ['legs', 'cardio', 'torso', 'descanso2', 'trineo', 'cardio', 'descanso2'],                # Híbrido
    0: ['pecho', 'espalda', 'descanso', 'hombros', 'piernas', 'brazos', 'descanso'],              # Bro Split
    6: ['legs', 'torso', 'descanso', 'piernas', 'legs', 'descanso', 'descanso'],                  # Glúteo y pierna
}
# las portadas de mujer que no tienen foto propia (todavía) y la que las sustituye
ALIAS_F = {'competencia': 'trineo'}
# las que no llevan a nadie: las mismas para todos
NEUTRAL = ['crossfit', 'hyrox', 'cardio', 'core', 'funcional']
# las otras versiones de cada portada, como las hace tools/variantes.py (VARIANTES: id → clave; el id empieza por male o female)
VARIANTS = {'M': {}, 'F': {}}
for _id, _key in re.findall(r"\('((?:male|female)_\w+)', '(\w+)'\)", open(os.path.join(ROOT, 'tools', 'variantes.py'), encoding='utf-8').read()):
    VARIANTS['F' if _id.startswith('female') else 'M'].setdefault(_key, []).append(_id)
# al medir el contraste, todo escondido menos la tarjeta del día (con el CSSOM: la política de seguridad no deja <style>)
ONLY_HERO = 'body *{visibility:hidden!important}.card.hero,.card.hero *{visibility:visible!important}'


def check(name, cond, info=''):
    (passes if cond else fails).append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def use(ev, prog, sex):
    ev("S.biometrics=S.biometrics||{};S.biometrics.sex='%s'" % sex)
    ev("sheet();W=null;S.program=%d;S.ownProgramIndex=-1;S.level='int';S.plan=levelPlan(parseProgram(%d),'int',%d);S.week=1;"
       "S.selectedWeekday=0;S.selectedDay=0;S.doneDays={};S.tab=0;R()" % (prog, prog, prog))


def week(ev):
    """La portada de cada día de la semana, como la pide la tarjeta del día (workout/day: un descanso, por «Descanso»)."""
    return ev("[0,1,2,3,4,5,6].map(w => { S.selectedWeekday = w; syncSel(); const d = S.plan[S.selectedDay]; "
              "return d && d.ex.length ? dayImage(d.n, d) : dayImage('Descanso'); })")


def main(path):
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=1, color_scheme='dark', **context_opts(path))
        c.add_init_script(INIT)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        pg.goto(app_url(path))
        pg.wait_for_timeout(300)
        pg.evaluate(SEED)
        pg.evaluate(EXTRA)
        pg.reload()
        pg.wait_for_timeout(500)
        ev = pg.evaluate
        M = ev("MEDIA.day")
        F = ev("MEDIA.dayF")
        order = [l.strip() for l in open(os.path.join(ROOT, 'src', 'img', 'day', 'order.txt'), encoding='utf-8') if l.strip() and not l.startswith('#')]

        print('Las fotos')
        check('hay una portada por cada clave de src/img/day/order.txt, en su orden', list(M) == order, str(list(M)))
        women = [k for k in order if k not in NEUTRAL and k not in ALIAS_F]
        check('las de mujer: todas las de gente menos competición (%d)' % len(women), sorted(F) == sorted(women), str(sorted(F)))
        loaded = ev("""Promise.all(Object.values(MEDIA.day).concat(Object.values(MEDIA.dayF)).map(u => new Promise(r => {
          const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => r(null); i.src = u; })))""")
        check('todas cargan (%d)' % len(loaded), all(loaded), str(loaded))
        check('las nuevas miden 704 × 440', sum(1 for x in loaded if x == [704, 440]) == len(F) + 9, str(loaded))

        print('Las otras versiones (tools/variantes.py)')
        MM, FM = ev("MEDIA.dayMore"), ev("MEDIA.dayMoreF")
        check('las del modelo: %s' % ', '.join('%s %d' % (k, len(v)) for k, v in VARIANTS['M'].items()),
              {k: len(v) for k, v in MM.items()} == {k: len(v) for k, v in VARIANTS['M'].items()}, str({k: len(v) for k, v in MM.items()}))
        check('las de la modelo: %s' % ', '.join('%s %d' % (k, len(v)) for k, v in VARIANTS['F'].items()),
              {k: len(v) for k, v in FM.items()} == {k: len(v) for k, v in VARIANTS['F'].items()}, str({k: len(v) for k, v in FM.items()}))
        more = [u for v in list(MM.values()) + list(FM.values()) for u in v]
        sizes = ev("us => Promise.all(us.map(u => new Promise(r => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => r(null); i.src = u; })))", more)
        check('todas cargan y miden 704 × 440 (%d)' % len(more), all(x == [704, 440] for x in sizes), str(sizes))
        for sex, mine, other in (('M', MM, FM), ('F', FM, MM)):
            ev("S.biometrics=S.biometrics||{};S.biometrics.sex='%s'" % sex)
            lists = ev("ks => ks.map(k => photosOf(k))", order)
            got = dict(zip(order, lists))
            theirs = {u for v in other.values() for u in v}
            check('con el perfil de %s, cada portada: la de siempre y las suyas, ninguna del otro' % ('mujer' if sex == 'F' else 'hombre'),
                  all(got[k][1:] == mine.get(k, []) and not theirs & set(got[k]) for k in order), str([k for k in order if got[k][1:] != mine.get(k, [])]))
        ev("S.biometrics.sex='F'")
        check('con el de mujer, Cardio: la de siempre (no lleva a nadie) y las de la modelo en la cinta', ev("photosOf('cardio')") == [M['cardio']] + FM['cardio'])

        print('Cada semana, otra; en la misma semana, sin repetir')
        photo = "(d => (coverStyle(d.n, d).match(/url\\(([^)]+)\\)/) || [])[1] || '')"
        for sex in ('M', 'F'):
            use(ev, 0, sex)
            weeks = [ev("w => { S.week = w; return S.plan.map(%s); }" % photo, w) for w in (1, 2, 3)]
            rest = [i for i, d in enumerate(ev("S.plan.map(d => d.ex.length)")) if not d]
            pec = [w[0] for w in weeks]
            n = len(ev("photosOf('pecho')"))
            check('Bro Split, %s: Pecho lleva otra cada semana (%d fotos) y los dos descansos de una semana, distintas' % ('mujer' if sex == 'F' else 'hombre', n),
                  len(set(pec)) == min(3, n) and all(w[rest[0]] != w[rest[1]] for w in weeks) and all(all(w) for w in weeks), str([[u[-20:] for u in w] for w in weeks]))
        use(ev, 3, 'M')
        ppl = ev("S.plan.map(%s)" % photo)
        names = ev("S.plan.map(d => d.n)")
        check('Push Pull Leg: Push A y Push B, distintas; Pull A y Pull B, también', ppl[names.index('Push A')] != ppl[names.index('Push B')] and ppl[names.index('Pull A')] != ppl[names.index('Pull B')])
        ev("S.week = 2; S.selectedWeekday = 0; syncSel(); R()")
        a = ev("getComputedStyle(document.querySelector('.card.hero')).backgroundImage")
        ev("R()")
        b2 = ev("getComputedStyle(document.querySelector('.card.hero')).backgroundImage")
        ev("A.openOverview()")
        o = ev("getComputedStyle(document.querySelector('#app .card.hero')).backgroundImage")
        ev("A.overviewBack()")
        check('al volver a pintar, la misma; y la del día es la de su Overview', a == b2 == o and 'url(' in a, str([a[-40:], b2[-40:], o[-40:]]))

        print('Entrenos a la carta y Programas')
        ev("S.biometrics.sex='M';A.openOnDemand()")
        pg.wait_for_timeout(200)
        od = ev("[...document.querySelectorAll('#sh .od-card')].map(c => [c.querySelector('b').textContent, +c.dataset.i, getComputedStyle(c).backgroundImage.slice(-40)])")
        arms = [u for nm, _, u in od if nm in ('Armageddon', 'Arm Assault')]
        check('dos rutinas de brazos, dos fotos distintas', len(arms) == 2 and arms[0] != arms[1], str(od))
        i, bg = [(i, u) for nm, i, u in od if nm == 'Arm Assault'][0]
        ev("A.onDemandShow(%d)" % i)
        pg.wait_for_timeout(100)
        hero = ev("getComputedStyle(document.querySelector('#sh .od-hero')).backgroundImage.slice(-40)")
        check('y la vista previa, la de su tarjeta', hero == bg, str([hero, bg]))
        for sex in ('M', 'F'):
            ev("sheet();S.biometrics.sex='%s';S.ownPrograms=[{n:'Mío',plan:levelPlan(parseProgram(2),'int',2)}];A.openPrograms()" % sex)
            pg.wait_for_timeout(200)
            cards = ev("[...document.querySelectorAll('#sh .pg-card')].map(c => [c.dataset.a, +c.dataset.i, getComputedStyle(c).backgroundImage])")
            urls = [re.search(r'url\("?([^")]+)', bg).group(1) if 'url(' in bg else '' for _, _, bg in cards]
            mine = FM if sex == 'F' else MM
            base = F if sex == 'F' else M
            ok_sex = all(u in set(base.values()) | {x for v in mine.values() for x in v} | {M[k] for k in NEUTRAL} for u in urls)
            own = urls[[a for a, _, _ in cards].index('openOwnProgram')]
            torso = urls[[(a, i) for a, i, _ in cards].index(('openProgramPreview', ev("PROGRAM_NAMES.indexOf('Torso / Pierna')")))]
            # el propio (un Torso / Pierna) lleva otra foto del torso que el de serie; la modelo solo tiene una
            check('Programas, %s: cada programa con su foto (los 7 y el propio), del perfil, sin repetir mientras quede otra' % ('mujer' if sex == 'F' else 'hombre'),
                  len(cards) == 8 and all(urls) and ok_sex and len(set(urls)) == (7 if sex == 'F' else 8) and (own == torso) == (sex == 'F'),
                  str([(a, i, u[-24:]) for (a, i, _), u in zip(cards, urls)]))
        ev("sheet();S.ownPrograms=[]")

        print('Con el perfil de mujer, las de la modelo')
        ev("S.biometrics=S.biometrics||{};S.biometrics.sex='F'")
        urls = ev("Object.keys(MEDIA.day).map(k => [k, photoUrl(k)])")
        got = {k: u for k, u in urls}
        check('cada portada de gente es la suya', all(got[k] == F[k] for k in F), str([k for k in F if got[k] != F[k]]))
        check('competición, la del trineo (mientras no haya foto propia); brazos, la suya (el tríceps en polea)',
              all(got[k] == F[v] for k, v in ALIAS_F.items()) and got['brazos'] == F['brazos'] != F['torso'])
        check('las que no llevan a nadie, las mismas que con el de hombre', all(got[k] == M[k] for k in NEUTRAL))
        ev("S.biometrics.sex='M'")
        check('con el de hombre, las de siempre', ev("Object.keys(MEDIA.day).every(k => photoUrl(k) == MEDIA.day[k])"))
        ev("delete S.biometrics.sex")
        check('y sin sexo elegido, también', ev("Object.keys(MEDIA.day).every(k => photoUrl(k) == MEDIA.day[k])"))

        print('Cada día de los programas')
        names = ev("PROGRAM_NAMES")
        for prog, want in WEEKS.items():
            for sex in ('M', 'F'):
                use(ev, prog, sex)
                got = week(ev)
                check('%s, %s: %s' % (names[prog], 'mujer' if sex == 'F' else 'hombre', ' · '.join(want)), got == want, str(got))
        use(ev, 5, 'F')
        fb = week(ev)
        firsts = ev("[0,1,2,3,4,5,6].map(w => { S.selectedWeekday = w; syncSel(); const d = S.plan[S.selectedDay]; return d && d.ex.length ? d.ex[0].n : ''; })")
        trained = {f: k for k, f in zip(fb, firsts) if f}
        check('Full Body: cada día, una distinta: la de su primer ejercicio o, si ya la lleva otro (A y C empiezan por pierna), la del siguiente',
              len(trained) == 3 and len(set(trained.values())) == 3 and trained.get('Sentadilla') == 'piernas' and trained.get('Sentadilla búlgara') == 'pecho', str(list(zip(firsts, fb))))
        use(ev, 5, 'M')
        check('con el de hombre, las mismas portadas', week(ev) == fb, str(week(ev)))
        # lo que se ve: la tarjeta del día lleva la foto de la modelo
        use(ev, 1, 'F')
        ev("S.selectedWeekday=3;syncSel();R()")
        bg = ev("getComputedStyle(document.querySelector('.card.hero')).backgroundImage")
        check('en la tarjeta del día (WOD CrossFit, mujer) se ve la foto de la modelo', F['thrusters'][-60:] in bg and M['thrusters'][-60:] not in bg)
        ev("S.selectedWeekday=2;syncSel();R()")
        bg = ev("getComputedStyle(document.querySelector('.card.hero')).backgroundImage")
        check('y el descanso de esa semana, el suyo (sentada en el cajón)', F['descanso2'][-60:] in bg)
        use(ev, 0, 'F')
        ev("S.selectedWeekday=2;syncSel();R()")
        bg = ev("getComputedStyle(document.querySelector('.card.hero')).backgroundImage")
        check('el de una semana de fuerza, el de siempre (por la calle)', F['descanso'][-60:] in bg)

        print('Workouts personalizados')
        ev("S.biometrics.sex='F'")
        k = ev("routineImage({n:'Mi WOD', bl:[{ex:['Wall balls','Thruster','Wall balls 100'],s:3}]})")
        check('sin portada elegida, la de sus ejercicios (la que más se repite): wall balls', k == 'wallballs', k)
        k = ev("routineImage({n:'Mi remo', bl:[{ex:['Remo con barra','Remo en máquina'],s:3}]})")
        check('el remo de espalda no es el del ergómetro', k == 'espalda', k)
        k = ev("routineImage({n:'Otro', img:'descanso2', bl:[{ex:['Press banca'],s:3}]})")
        check('una portada de descanso no vale para un workout: la de sus ejercicios', k == 'pecho', k)
        ev("S.routines=[{n:'Prueba',img:'snatch',bl:[{ex:['Snatch'],s:3,r:90}]}];saveState();A.routineEditorBack();A.routineEdit(0)")
        pg.wait_for_timeout(200)
        tiles = ev("[...document.querySelectorAll('#sh [data-a=routineSetImage]')].map(b => [b.dataset.v, b.getAttribute('aria-label'), b.querySelector('img').src])")
        keys = [t[0] for t in tiles]
        check('el selector enseña todas menos los descansos (%d), en el orden de order.txt' % len(tiles), keys == [k for k in order if not k.startswith('descanso')], str(keys))
        check('con el perfil de mujer, las de la modelo', all(t[2] == (F.get(t[0]) or F.get(ALIAS_F.get(t[0], '')) or M[t[0]]) for t in tiles))
        check('cada una con su nombre para el lector de pantalla', all(t[1] and t[1] != t[0] for t in tiles) and dict((t[0], t[1]) for t in tiles)['legs'] == 'Hip thrust', str([t[:2] for t in tiles]))
        check('la elegida, marcada', ev("document.querySelector('#sh [data-v=snatch]').className.includes('bd-2-solid-a2')"))
        ev("sheet()")

        print('El texto de la tarjeta del día sobre cada portada (AA), en cada una de sus fotos')
        for sex in ('M', 'F'):
            bad, n = [], 0
            for key in order:
                ev("S.biometrics=S.biometrics||{};S.biometrics.sex='%s'" % sex)
                for v in range(len(ev("photosOf('%s')" % key))):
                    n += 1
                    # la foto v: la que lleva ese día en la semana v + 1 (es el primero con esa portada de la semana)
                    if key.startswith('descanso'):
                        use(ev, 1 if key == 'descanso2' else 0, sex)
                        ev("S.week=%d;S.selectedWeekday=2;syncSel();R()" % (v + 1))
                    else:
                        use(ev, 0, sex)
                        ev("S.week=%d;S.plan[0]=Object.assign({},S.plan[0],{cu:1,img:'%s'});R()" % (v + 1, key))
                    pg.evaluate('window.scrollTo(0, 0)')
                    # solo el texto de la tarjeta del día, que es lo que va sobre la portada: lo demás se esconde mientras se mide
                    # (el resto de la pantalla lo mide tests/contrast.py)
                    pg.evaluate("css => { const s = new CSSStyleSheet(); s.replaceSync(css); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; window.__only = s; }", ONLY_HERO)
                    for r in measure(pg):
                        if r[0] < r[1] - .005:
                            bad.append('%s (%d): «%s» %.2f:1 (pide %.1f) sobre %s' % (key, v + 1, r[2][:22], r[0], r[1], r[5]))
                    pg.evaluate("document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== window.__only)")
            check('%d fotos de las %d portadas, %s: todo el texto se lee' % (n, len(order), 'mujer' if sex == 'F' else 'hombre'), not bad, '; '.join(bad[:6]))
        c.close()
        b.close()

    print('En el paquete')
    app = os.path.join(ROOT, 'dist', 'app')
    if os.path.isfile(os.path.join(app, 'sw.js')):
        sw = open(os.path.join(app, 'sw.js'), encoding='utf-8').read()
        files = ['img/day/' + f for f in os.listdir(os.path.join(app, 'img', 'day')) if not os.path.isdir(os.path.join(app, 'img', 'day', f))]
        files += ['img/day/mujer/' + f for f in os.listdir(os.path.join(app, 'img', 'day', 'mujer'))]
        extra = sum(len(v) for v in VARIANTS['M'].values()) + sum(len(v) for v in VARIANTS['F'].values())
        check('las %d portadas (con sus %d otras fotos) son archivos del paquete y el service worker las guarda para abrir sin conexión' % (len(files), extra),
              len(files) == len(order) + len(women) + extra and all(f in sw for f in files), str([f for f in files if f not in sw]))
    else:
        print('  (sin dist/app: no se mira)')
    check('sin errores de JS', not errs, str(errs[:3]))
    print('\n%d correctas, %d fallos' % (len(passes), len(fails)))
    print('TODO CORRECTO' if not fails else 'HAY FALLOS')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'stratafit.html')))
