"""Avisos, deshacer y «atrás» (auditoría de la V1.0.3, fase 6).

- El aviso breve cabe en la pantalla a 320 y a 390 px (los largos saltan de línea: antes se salían por los dos lados), lo leen
  los lectores de pantalla, dura más cuanto más largo es y no recoge los toques (lo que tapa sigue respondiendo).
- Lo que se quita sin preguntar se puede deshacer, y vuelve a su sitio tal como estaba: un alimento de una comida, un ejercicio
  del día, un plato guardado, una serie ya hecha, las marcas de la semana y la plantilla que se sustituye.
- «Atrás» (el gesto o el botón del móvil) dentro de un grupo de la librería vuelve a los grupos.
- En el paquete instalable, lo que se descarga al usarlo dice «Cargando…» si tarda y avisa si no se puede descargar.

  python3 tests/ux.py dist/stratafit.html
"""
import os, sys, json, time, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))
passes, fails = [], []


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


def check(name, cond, info=''):
    (passes if cond else fails).append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


BOX = "(e => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.height)]; })(document.querySelector('.tst'))"


def main(path):
    errs = []
    with sync_playwright() as p:
        b = launch(p)

        def device(width, height):
            c = b.new_context(viewport={'width': width, 'height': height}, has_touch=True, color_scheme='dark', **context_opts(path))
            c.add_init_script(rd('init.js'))
            pg = c.new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.clock.install(time=datetime.datetime(2026, 11, 12, 10, 0))
            pg.goto(app_url(path))
            pg.clock.run_for(800)
            pg.evaluate(rd('seed.js'))
            pg.clock.run_for(400)
            return c, pg

        print('El aviso breve')
        for width, height in ((320, 568), (390, 844)):
            c, pg = device(width, height)
            ev = pg.evaluate
            # (el aviso de un error inesperado es de los más largos de la app: sale al fallar algo que nadie recoge)
            ev("queueMicrotask(() => { throw new Error('aviso de prueba') })")
            pg.wait_for_timeout(450)  # (pasada la animación de entrada)
            box = ev(BOX)
            text = ev("document.querySelector('#tt').innerText")
            check('a %d px, un aviso largo (%d letras) cabe en la pantalla, en varias líneas' % (width, len(text)), bool(box) and len(text) > 60 and box[0] >= 8 and box[1] <= width - 8 and box[2] > 45, '%s %s' % (box, text))
            c.close()
            errs.clear()
        c, pg = device(390, 844)
        ev = pg.evaluate
        run = lambda ms=300: pg.clock.run_for(ms)
        tt = lambda: ev("document.querySelector('#tt').innerText")
        check('los lectores de pantalla leen el aviso al salir', ev("(t => t.getAttribute('role') == 'status' && t.getAttribute('aria-live') == 'polite')(document.querySelector('#tt'))"))
        ev("S.tab = 1; R()")
        run()
        day = "S.meals[dayKey(new Date())]"
        before = ev("JSON.stringify(%s)" % day)
        ev("document.querySelector('[data-a=removeMealItem]').click()")
        run(100)
        gone = ev("JSON.stringify(%s)" % day)
        check('al quitar un alimento sale el aviso con «Deshacer»', gone != before and '«Arroz» quitado' in tt() and ev("!!document.querySelector('.tst [data-a=toastUndo]')"), tt())
        # el aviso no recoge los toques (tapa el «←» y el título de una página): lo de debajo responde; su «Deshacer», también
        hit = ev("""(() => { const c = e => { const r = e.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); };
          const t = document.querySelector('.tst'), u = t.querySelector('.tsu'), r = t.getBoundingClientRect(), under = document.elementFromPoint(r.left + 8, r.top + r.height / 2);
          return [!!under && !t.contains(under), c(u) == u]; })()""")
        check('el aviso no tapa los toques: lo de debajo responde, y su «Deshacer» se puede tocar', hit == [True, True], str(hit))
        run(2700)
        check('el aviso con «Deshacer» sigue a la vista pasado el tiempo de un aviso normal', 'Deshacer' in tt(), tt())
        ev("document.querySelector('[data-a=toastUndo]').click()")
        run()
        check('«Deshacer» devuelve el alimento a su comida y a su sitio', ev("JSON.stringify(%s)" % day) == before and tt() == '', tt())
        ev("document.querySelector('[data-a=removeMealItem]').click()")
        run(6200)
        check('sin tocarlo, el aviso se va a los 6 segundos y lo quitado se queda quitado', tt() == '' and ev("JSON.stringify(%s)" % day) == gone, tt())
        ev("(m => { %s = JSON.parse(m); saveState(); R(); })(%s)" % (day, json.dumps(before)))
        ev("document.querySelector('#tt').innerHTML = ''; S.tab = 0; R()")
        run()

        print('Deshacer lo que se quita')
        ev("A.openOverview(); A.overviewEdit()")
        run()
        plan = ev("JSON.stringify(S.plan[S.selectedDay])")
        ev("S.plan[S.selectedDay].ex[1].r = 75; S.plan[S.selectedDay].ex[1].rg = [5, 8]; R()")
        plan = ev("JSON.stringify(S.plan[S.selectedDay])")
        ev("document.querySelectorAll('[data-a=removePlanExercise]')[1].click()")
        run(100)
        check('quitar un ejercicio del día: aviso con «Deshacer»', ev("S.plan[S.selectedDay].ex.length") == 4 and 'quitado del día' in tt() and 'Deshacer' in tt(), tt())
        ev("document.querySelector('[data-a=toastUndo]').click()")
        run()
        check('y vuelve a su sitio con su descanso y su rango', ev("JSON.stringify(S.plan[S.selectedDay])") == plan)
        ev("A.overviewDiscard(); A.overviewBack()")
        run()
        dishes = ev("JSON.stringify(S.savedDishes)")
        ev("S.tab = 1; R(); A.openAddFood(0); A.addTab(1)")  # Añadir alimento → Librería (los platos guardados)
        run()
        ev("document.querySelector('[data-a=libraryDishDelete]').click()")
        run(100)
        check('borrar un plato guardado: aviso con «Deshacer»', ev("S.savedDishes.length") == 0 and 'Plato «Plato fuerte» borrado' in tt() and 'Deshacer' in tt(), tt())
        ev("document.querySelector('[data-a=toastUndo]').click()")
        run()
        check('y el plato vuelve', ev("JSON.stringify(S.savedDishes)") == dishes)
        ev("sheet(); S.tab = 0; R()")
        marks = ev("JSON.stringify(S.doneDays)")
        ev("A.resetWeek()")
        run(100)
        check('reiniciar la semana: aviso con «Deshacer»', ev("Object.keys(S.doneDays).length") == 0 and 'Semana reiniciada' in tt() and 'Deshacer' in tt(), tt())
        ev("document.querySelector('[data-a=toastUndo]').click()")
        run()
        check('y los días hechos vuelven', ev("JSON.stringify(S.doneDays)") == marks)
        ev("A.resetWeek()")
        run(100)
        ev("A.resetWeek()")
        run(100)
        check('sin días hechos, lo dice y no ofrece deshacer', 'ya estaba sin días hechos' in tt() and 'Deshacer' not in tt(), tt())
        ev("S.tab = 1; R()")
        run()
        tpl = ev("JSON.stringify(S.mealTemplates)")
        ev("A.templateSave()")
        run(100)
        check('guardar una plantilla sobre otra: aviso con «Deshacer»', ev("JSON.stringify(S.mealTemplates)") != tpl and 'guardada' in tt() and 'Deshacer' in tt(), tt())
        ev("document.querySelector('[data-a=toastUndo]').click()")
        run()
        check('y vuelve la plantilla de antes', ev("JSON.stringify(S.mealTemplates)") == tpl)
        ev("S.tab = 0; R(); A.startWorkout()")
        run(400)
        n = ev("W.sets[0].length")
        ev("W.sets[0][W.sets[0].length - 1].ok = 1; R(); A.removeSet(0)")
        run(100)
        check('quitar una serie ya hecha: aviso con «Deshacer»', ev("W.sets[0].length") == n - 1 and 'Serie hecha quitada' in tt(), tt())
        ev("document.querySelector('[data-a=toastUndo]').click()")
        run()
        check('y la serie vuelve, hecha', ev("W.sets[0].length") == n and ev("!!W.sets[0][W.sets[0].length - 1].ok"))
        ev("W.sets[0][W.sets[0].length - 1].ok = 0; R(); A.removeSet(0)")
        run(100)
        check('una serie sin hacer se quita sin aviso', ev("W.sets[0].length") == n - 1 and 'quitada' not in tt(), tt())
        ev("A.discardWorkout()")
        run()

        print('«Atrás»')
        ev("A.openLibrary(); A.libraryGroup(0, { dataset: { v: 'Pecho' } })")
        run(400)
        check('en un grupo de la librería se ve el grupo', ev("document.querySelector('#sh .sp').textContent.includes('‹ Grupos')"))
        ev("backTarget().go()")
        run(400)
        check('«atrás» vuelve a los grupos (antes cerraba la librería)', ev("!!document.querySelector('#sh .sp .gg') && !document.querySelector('#sh .sp').textContent.includes('‹ Grupos')"))
        ev("backTarget().go()")
        run(400)
        check('y otro «atrás» cierra la librería', ev("!document.querySelector('#sh .sp')"))

        check('sin errores de JavaScript', not errs, '; '.join(errs[:3]))
        c.close()

        # en el paquete instalable, lo poco usado se descarga la primera vez que se abre (core/lazy): sin service worker (aún no
        # ha guardado nada, o el navegador no lo tiene) y con mala cobertura, se dice que está cargando o que no se ha podido
        pkg = os.path.join(os.path.dirname(os.path.abspath(path)), 'app', 'index.html')
        if os.path.exists(pkg):
            print('Lo que se descarga al usarlo (paquete instalable)')
            mode = {'fail': False}

            def chunk(route):
                if mode['fail']:
                    route.abort()
                else:
                    time.sleep(1.2)
                    route.continue_()

            def package():
                c = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
                c.add_init_script(rd('init.js'))
                pg = c.new_page()
                pg.route('**/js/wod-*.js', chunk)
                pg.goto(app_url(pkg))
                pg.wait_for_timeout(600)
                return c, pg

            c, pg = package()
            pg.evaluate("S.tab = 0; R(); document.querySelector('[data-a=openWod]').click()")
            pg.wait_for_timeout(800)
            first = pg.evaluate("document.querySelector('#tt').innerText")
            pg.wait_for_timeout(1500)
            check('si tarda en descargarse, dice «Cargando…» y después se abre', 'Cargando' in first and pg.evaluate("document.querySelector('#sh .sp').textContent.includes('Temporizador WOD')"), first)
            c.close()
            mode['fail'] = True
            c, pg = package()
            pg.evaluate("S.tab = 0; R(); document.querySelector('[data-a=openWod]').click()")
            pg.wait_for_timeout(900)
            said = pg.evaluate("document.querySelector('#tt').innerText")
            box = pg.evaluate(BOX)
            check('si no se puede descargar, lo dice (y el aviso cabe en la pantalla)', 'No se ha podido abrir' in said and box[0] >= 8 and box[1] <= 382, '%s %s' % (said, box))
            mode['fail'] = False
            pg.evaluate("document.querySelector('[data-a=openWod]').click()")
            pg.wait_for_timeout(2200)
            check('y al volver a intentarlo con red, se abre', pg.evaluate("!!document.querySelector('#sh .sp') && document.querySelector('#sh .sp').textContent.includes('Temporizador WOD')"))
            c.close()
        b.close()
    print('\n%d comprobaciones, %d fallan' % (len(passes) + len(fails), len(fails)))
    print('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'dist', 'stratafit.html')))
