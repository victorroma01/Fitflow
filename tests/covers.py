"""Prueba de las portadas de los días (data/photos, workout/images):

  · qué portada lleva cada día de los programas, por su nombre, con el perfil de hombre y con el de mujer (las de la modelo y,
    mientras falte alguna, la que la sustituye: la de competición, la del trineo);
  · los descansos: los de una semana con CrossFit, Hyrox o funcional llevan los suyos (descanso2), y los demás, los de siempre;
  · un día cuyo nombre no dice nada (Full Body) lleva la de su primer ejercicio; un workout personalizado, la elegida o la de sus
    ejercicios, y su selector enseña las del perfil;
  · todas las fotos cargan y el paquete las guarda para abrir sin conexión;
  · el texto de la tarjeta del día se lee (AA) sobre cada portada, en las de hombre y en las de mujer (medido como en
    tests/contrast.py).

  python3 tests/covers.py dist/stratafit.html
"""
import os, sys
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
# al medir el contraste, todo escondido menos la tarjeta del día (con el CSSOM: la política de seguridad no deja <style>)
ONLY_HERO = 'body *{visibility:hidden!important}.cd.hero,.cd.hero *{visibility:visible!important}'


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
        check('Full Body: cada día, la de su primer ejercicio (antes no llevaban ninguna)',
              all(k for k, f in zip(fb, firsts) if f) and fb[0] == 'piernas', str(list(zip(firsts, fb))))
        # lo que se ve: la tarjeta del día lleva la foto de la modelo
        use(ev, 1, 'F')
        ev("S.selectedWeekday=3;syncSel();R()")
        bg = ev("getComputedStyle(document.querySelector('.cd.hero')).backgroundImage")
        check('en la tarjeta del día (WOD CrossFit, mujer) se ve la foto de la modelo', F['thrusters'][-60:] in bg and M['thrusters'][-60:] not in bg)
        ev("S.selectedWeekday=2;syncSel();R()")
        bg = ev("getComputedStyle(document.querySelector('.cd.hero')).backgroundImage")
        check('y el descanso de esa semana, el suyo (sentada en el cajón)', F['descanso2'][-60:] in bg)
        use(ev, 0, 'F')
        ev("S.selectedWeekday=2;syncSel();R()")
        bg = ev("getComputedStyle(document.querySelector('.cd.hero')).backgroundImage")
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

        print('El texto de la tarjeta del día sobre cada portada (AA)')
        for sex in ('M', 'F'):
            bad = []
            for key in order:
                if key.startswith('descanso'):
                    use(ev, 1 if key == 'descanso2' else 0, sex)
                    ev("S.selectedWeekday=2;syncSel();R()")
                else:
                    use(ev, 0, sex)
                    ev("S.plan[0]=Object.assign({},S.plan[0],{cu:1,img:'%s'});R()" % key)
                pg.evaluate('window.scrollTo(0, 0)')
                # solo el texto de la tarjeta del día, que es lo que va sobre la portada: lo demás se esconde mientras se mide
                # (el resto de la pantalla lo mide tests/contrast.py)
                pg.evaluate("css => { const s = new CSSStyleSheet(); s.replaceSync(css); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; window.__only = s; }", ONLY_HERO)
                for r in measure(pg):
                    if r[0] < r[1] - .005:
                        bad.append('%s: «%s» %.2f:1 (pide %.1f) sobre %s' % (key, r[2][:22], r[0], r[1], r[5]))
                pg.evaluate("document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== window.__only)")
            check('%d portadas, %s: todo el texto se lee' % (len(order), 'mujer' if sex == 'F' else 'hombre'), not bad, '; '.join(bad[:6]))
        c.close()
        b.close()

    print('En el paquete')
    app = os.path.join(ROOT, 'dist', 'app')
    if os.path.isfile(os.path.join(app, 'sw.js')):
        sw = open(os.path.join(app, 'sw.js'), encoding='utf-8').read()
        files = ['img/day/' + f for f in os.listdir(os.path.join(app, 'img', 'day')) if not os.path.isdir(os.path.join(app, 'img', 'day', f))]
        files += ['img/day/mujer/' + f for f in os.listdir(os.path.join(app, 'img', 'day', 'mujer'))]
        check('las %d portadas son archivos del paquete y el service worker las guarda para abrir sin conexión' % len(files),
              len(files) == len(order) + len(women) and all(f in sw for f in files), str([f for f in files if f not in sw]))
    else:
        print('  (sin dist/app: no se mira)')
    check('sin errores de JS', not errs, str(errs[:3]))
    print('\n%d correctas, %d fallos' % (len(passes), len(fails)))
    print('TODO CORRECTO' if not fails else 'HAY FALLOS')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'stratafit.html')))
