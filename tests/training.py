"""Entreno a fondo (auditoría de la V1.0.3, fase 4): lo que se guarda de un entreno es lo que se hizo, con el ejercicio que
se hizo, y lo que la app propone para la siguiente vez sale de las mismas reglas que se prueban sueltas (tests/calc.test.mjs).

- Duración: guardar con el entreno en pausa no cuenta la pausa; reanudar uno que se cerró en pausa, tampoco.
- Reanudar un entreno a medias cuando el día del plan ha cambiado (o ya no existe): sigue con los ejercicios con los que
  empezó, guarda cada serie en su ejercicio y el plan queda como lo dejó el usuario.
- Swap a mitad de un ejercicio: las series ya hechas se guardan en el ejercicio con el que se hicieron.
- Marcas: los ejercicios que se miden en tiempo o distancia no tienen 1RM ni récords; una serie sin repeticiones, con más de
  30 o un drop set no dan récord; el aviso de récord de peso sale una vez.
- Progresión: cada serie parte del peso que tuvo la última vez; frente a la misma regla escrita aquí aparte, con sesiones al
  azar (semilla fija); la descarga y el calentamiento nunca pesan más que la serie normal.
- Ejercicios propios: no se duplican, se renombran (con su historial, récords, notas, plan y workouts) y se eliminan.
- Workouts propios: uno a medio crear no se queda en la lista; los nombres no se quedan vacíos; sin ejercicios no hay entreno.
- Borrar un registro borra también sus series del historial y recalcula récords.

  python3 tests/training.py dist/stratafit.html
"""
import os, sys, json, math, random, datetime, zoneinfo
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))
MADRID = zoneinfo.ZoneInfo('Europe/Madrid')
passes, fails = [], []


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


def check(name, cond, info=''):
    (passes if cond else fails).append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def jsround(x):
    """Math.round de JavaScript (la mitad, hacia arriba)."""
    return math.floor(x + 0.5)


def half(x):
    return jsround(x * 2) / 2


def expected(last, lo, hi, n, step=2.5):
    """Lo que toca en cada una de las `n` series según la última sesión `last` ([[repeticiones, peso, RPE]]): la regla de la
    app (doble progresión), escrita aquí aparte."""
    top = max(s[1] for s in last)
    rpes = [s[2] for s in last if s[2] > 0]
    full = top > 0 and all(s[0] >= hi and s[1] > 0 for s in last)
    low = not full and top > 0 and all(s[0] < lo and s[1] > 0 for s in last)
    up = full and not (rpes and sum(rpes) / len(rpes) >= 9.5)
    down = low and 0 < half(top * .92) < top
    out = []
    for j in range(n):
        reps, w = last[min(j, len(last) - 1)][:2]
        base = w if w > 0 else top
        if up:
            base = half(base + step)
        elif down:
            v = half(base * .92)
            base = v if 0 < v < base else base
        out.append([lo if up or down else min(hi, reps + 1), base if base > 0 else 0])
    return out


def main(path):
    rnd = random.Random(20261113)
    errs = []
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Madrid', locale='es-ES', **context_opts(path))
        c.add_init_script(rd('init.js'))
        pg = c.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.clock.install(time=datetime.datetime(2026, 11, 12, 10, 0, tzinfo=MADRID))
        pg.goto(app_url(path))
        pg.clock.run_for(800)
        pg.evaluate(rd('seed.js'))
        pg.clock.run_for(500)
        ev = pg.evaluate
        run = lambda ms=300: pg.clock.run_for(ms)
        # salto en el tiempo: los temporizadores vencidos se disparan una vez
        ff = lambda ms: (pg.clock.fast_forward(ms), run(300))
        text = lambda sel='#app': ev("(e => e ? e.innerText : '')(document.querySelector(%s))" % json.dumps(sel))
        today = ev('dayKey(new Date())')

        def set_day(exercises, day=0, history=None):
            """El día `day` del plan con estos ejercicios, elegido y sin entreno en curso (semana 1: sin descarga)."""
            ev("""([ex, day, hist]) => { sheet(); W = null; S.planBackup = null; S.plan[day] = { n: 'Prueba', ex };
                 S.week = 1; S.deloadWeeks = {}; S.selectedWeekday = day; S.selectedDay = day; S.doneDays = {}; S.tab = 0;
                 if (hist) S.exerciseHistory = hist; saveState(); R(); }""", [exercises, day, history])
            run()

        def start():
            ev("A.startWorkout()")
            run(400)

        def do(i, j, reps, weight):
            """Hace la serie `j` del ejercicio `i` con esas repeticiones y ese peso (como al escribirlos y marcarla)."""
            ev("""([i, j, r, w]) => { const s = W.sets[i][j]; s.r = r; s.w = w; s.ws = 0; s.ok = 1; R(); }""", [i, j, reps, weight])
            run(100)

        def finish():
            ev("A.finishSave()")
            run(500)
            ev("sheet()")
            run(200)

        hist = lambda n: ev("n => JSON.parse(JSON.stringify(S.exerciseHistory[n] || []))", n)
        rows = lambda n, k=0: [s[:2] for s in hist(n)[k]['s']] if len(hist(n)) > k else None
        press = {'n': 'Press banca', 's': 3, 'rg': [8, 12]}
        curl = {'n': 'Curl martillo', 's': 2, 'rg': [8, 12]}
        dips = {'n': 'Fondos', 's': 2, 'rg': [8, 12]}

        print('Duración y pausa')
        set_day([dict(press, s=2)], history={})
        start()
        do(0, 0, 8, 60)
        do(0, 1, 8, 60)
        ff(30 * 60000)
        ev("A.togglePause()")
        ff(20 * 60000)
        check('en pausa, el reloj se queda en lo que llevaba el entreno', text('#tm') in ('30:00', '30:01'), text('#tm'))
        ev("A.finishSave()")
        run(500)
        log = ev("S.logs[S.logs.length - 1]")
        check('guardar en pausa no cuenta la pausa (30 min, no 50)', log['m'] == 30, str(log))
        check('y el resumen dice lo mismo', '30 min' in text('#sh'), text('#sh')[:200])
        ev("sheet()")

        set_day([dict(press, s=2)], history={})
        start()
        ff(10 * 60000)
        ev("A.togglePause()")
        ff(5 * 60000)
        ev("R()")  # (cada pintado guarda el entreno a medias, con su hora)
        run()
        ff(60 * 60000)
        pg.reload()
        run(900)
        check('tras cerrar la app con el entreno en pausa, sale «Entreno en curso»', 'ENTRENO EN CURSO' in text())
        ev("A.resumeWorkout()")
        run(400)
        check('al reanudarlo, ni la pausa ni el tiempo cerrada cuentan (10 min)', text('#tm') in ('10:00', '10:01'), text('#tm'))
        ev("A.discardWorkout()")
        run()

        print('Reanudar con el día cambiado')
        set_day([dict(press, s=2), curl, dips], history={})
        start()
        do(0, 0, 8, 60)
        run(400)
        pg.reload()
        run(900)
        ev("S.plan[0].ex.splice(0, 1); saveState(); R()")  # el usuario quita el primer ejercicio antes de reanudar
        run()
        pg.reload()
        run(900)
        check('el entreno a medias no se pierde por cambiar el día', 'ENTRENO EN CURSO' in text(), text()[:200])
        ev("A.resumeWorkout()")
        run(500)
        names = ev("S.plan[S.selectedDay].ex.map(e => e.n)")
        check('se reanuda con los ejercicios con los que empezó', names == ['Press banca', 'Curl martillo', 'Fondos'], str(names))
        check('y la serie hecha sigue siendo de su ejercicio', ev("W.sets.length == 3 && !!W.sets[0][0].ok && W.sets[0][0].w == 60"))
        do(1, 0, 10, 14)
        n0 = ev("S.logs.length")
        finish()
        check('se puede guardar (antes fallaba al guardar)', ev("S.logs.length") == n0 + 1 and ev("!W"), str(errs[-2:]))
        check('cada serie va al historial de su ejercicio', rows('Press banca') == [[8, 60]] and rows('Curl martillo') == [[10, 14]] and not hist('Fondos'),
              '%s %s %s' % (rows('Press banca'), rows('Curl martillo'), hist('Fondos')))
        check('el plan queda como lo dejó el usuario', ev("S.plan[0].ex.map(e => e.n)") == ['Curl martillo', 'Fondos'] and ev("!S.planBackup"))
        check('y ese día del plan no cuenta como hecho', ev("!S.doneDays['1-0']"), str(ev("S.doneDays")))

        set_day([dict(press, s=2), curl], day=4, history={})
        start()
        do(0, 0, 8, 60)
        run(400)
        pg.reload()
        run(900)
        ev("S.plan = S.plan.slice(0, 3); S.selectedDay = 0; S.selectedWeekday = 0; saveState(); R()")  # llega otro programa, más corto
        run()
        before = ev("S.plan[0].ex.map(e => e.n)")
        ev("A.resumeWorkout()")
        run(500)
        check('si ese día ya no existe en el plan, se reanuda sobre el que se ve', ev("!!W && S.plan[S.selectedDay].ex.map(e => e.n).join() == 'Press banca,Curl martillo'"))
        finish()
        check('y al guardar vuelve el día del plan', ev("S.plan[0].ex.map(e => e.n)") == before and rows('Press banca') == [[8, 60]], str(ev("S.plan[0].ex.map(e => e.n)")))
        ev("S.plan = parseProgram(0); S.selectedDay = 0; S.selectedWeekday = 0; saveState(); R()")
        run()

        print('Swap a mitad de un ejercicio')
        set_day([press, curl], history={})
        ev("S.records = {}; S.lastWeights = {}; saveState()")
        start()
        do(0, 0, 8, 60)
        do(0, 1, 8, 60)
        ev("A.openSwap(0)")
        run()
        ev("U.swapSearch('press inclinado mancuernas'); document.querySelector('[data-a=swapDo][data-n=\"Press inclinado mancuernas\"]').click()")
        run(400)
        check('el ejercicio cambia', ev("S.plan[0].ex[0].n") == 'Press inclinado mancuernas')
        check('y se avisa de dónde se guardan las series ya hechas', 'Las series ya hechas se guardan en «Press banca»' in text('#ex0'), text('#ex0')[:300])
        do(0, 2, 10, 20)
        finish()
        check('las series hechas antes del cambio van al ejercicio con el que se hicieron', rows('Press banca') == [[8, 60], [8, 60]], str(rows('Press banca')))
        check('y la de después, al nuevo', rows('Press inclinado mancuernas') == [[10, 20]], str(rows('Press inclinado mancuernas')))
        check('con el último peso de cada uno', ev("S.lastWeights['Press banca'] == 60 && S.lastWeights['Press inclinado mancuernas'] == 20"))
        check('el récord es de cada ejercicio con sus series', ev("S.records['Press banca'].w == 60 && S.records['Press inclinado mancuernas'].w == 20"), str(ev("S.records")))
        set_day([press, curl], history={})
        start()
        do(0, 0, 8, 60)
        ev("A.openSwap(0)")
        run()
        ev("U.swapSearch('press inclinado mancuernas'); document.querySelector('[data-a=swapDo][data-n=\"Press inclinado mancuernas\"]').click()")
        run(400)
        do(0, 1, 10, 20)
        ev("A.swapUndo(0)")
        run()
        do(0, 2, 9, 60)
        finish()
        check('al deshacer el cambio, cada serie sigue con su ejercicio', rows('Press banca') == [[8, 60], [9, 60]] and rows('Press inclinado mancuernas') == [[10, 20]],
              '%s %s' % (rows('Press banca'), rows('Press inclinado mancuernas')))

        print('Marcas')
        set_day([{'n': 'Farmers carry 200 m', 's': 2}, dict(press, s=1)], history={})
        ev("S.records = {}; S.logs = []; saveState()")
        start()
        do(0, 0, 200, 32)
        do(0, 1, 200, 32)
        do(1, 0, 8, 60)
        finish()
        ev("S.tab = 2; R()")
        run()
        dash = text()
        rec = dash[dash.index('Récords personales'):dash.index('Progreso por ejercicio')]
        check('un arrastre con peso (200 m) no sale en los récords', 'Farmers' not in rec and 'Press banca' in rec and '60 kg × 8' in rec, rec[:200])
        check('ni tiene récord guardado', ev("!S.records['Farmers carry 200 m'] && !bestOf('Farmers carry 200 m') && bestOf('Press banca').w == 60"))
        ev("""(() => { const s = document.querySelector('[data-c=progressExercise]'); s.value = [...s.options].findIndex(o => o.textContent.startsWith('Farmers'));
              s.dispatchEvent(new Event('change', { bubbles: true })); })()""")
        run()
        prog = text('#pgc')
        check('en su gráfica se ve el peso máximo, sin 1RM ni volumen', 'Se mide en tiempo o distancia' in prog and '32 kg' in prog and 'Peso máximo' in prog and '1RM' not in prog, prog[:200])
        ev("A.exerciseDetailByName(0, { dataset: { n: 'Farmers carry 200 m' } })")
        run(400)
        check('y su ficha no enseña una mejor marca', 'TU MEJOR MARCA' not in text('#sh') and 'Farmers carry 200 m' in text('#sh'))
        ev("sheet(); A.openAnalysis()")
        run(400)
        ana = text('#sh')
        check('en el análisis del mes no cuenta como ejercicio con más volumen', 'Farmers' not in ana and 'Press banca' in ana, ana[:300])
        ev("sheet()")

        set_day([dict(press, s=3)], history={})
        ev("S.records = {}; saveState()")
        start()
        do(0, 0, 0, 200)   # sin repeticiones
        do(0, 1, 35, 50)   # más de 30
        do(0, 2, 5, 100)
        ev("A.addDropSet(0, { dataset: { j: 2 } })")
        run()
        do(0, 3, 20, 75)   # el drop set: 75 × 20 daría más 1RM que 100 × 5
        finish()
        r = ev("S.records['Press banca']")
        check('una serie sin repeticiones, una de más de 30 y un drop set no dan récord', r['w'] == 100 and r['r'] == 5, str(r))
        check('en el historial están todas, tal como se hicieron', rows('Press banca') == [[0, 200], [35, 50], [5, 100], [20, 75]], str(rows('Press banca')))

        set_day([dict(press, s=3)], history={'Press banca': [{'d': '2026-11-05', 's': [[8, 60, 0, 0]]}]})
        start()
        toast = lambda: text('#tt')
        click_done = lambda j: (ev("document.querySelector('.ck[data-i=\"0\"][data-j=\"%d\"]').click()" % j), run(200))
        ev("W.sets[0].forEach(s => { s.w = 70; s.r = 8; s.ws = 0; }); R()")
        click_done(0)
        first = toast()
        ev("document.querySelector('#tt').innerHTML = ''")
        click_done(1)
        second = toast()
        check('el aviso de récord de peso sale en la primera serie con ese peso', 'Nuevo récord en Press banca: 70 kg' in first, first)
        check('y no se repite en las siguientes con el mismo', 'Nuevo récord' not in second, second)
        ev("A.discardWorkout()")
        run()

        print('Progresión')
        set_day([press], history={'Press banca': [{'d': '2026-11-05', 's': [[10, 80, 8, 0], [10, 75, 8, 0], [9, 70, 8, 0]]}]})
        start()
        got = ev("W.sets[0].map(s => [s.r, s.w])")
        check('con pesos distintos la última vez, cada serie parte del suyo (antes, 80 kg en todas)', got == [[11, 80], [11, 75], [10, 70]], str(got))
        check('y la sugerencia lo dice', 'mantén el peso de cada serie y busca 1 rep más hasta 12' in text('#ex0'), text('#ex0')[:300])
        check('sin «Aplicar» mientras las series llevan lo sugerido', ev("!document.querySelector('[data-a=applySuggestion]')"))
        ev("(e => { e.value = '90'; e.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('[data-c=setWeight][data-i=\"0\"][data-j=\"0\"]'))")
        run()
        check('«Aplicar» sale al escribir otro peso', ev("!!document.querySelector('[data-a=applySuggestion]')"))
        ev("document.querySelector('[data-a=applySuggestion]').click()")
        run()
        check('y devuelve lo sugerido', ev("W.sets[0].map(s => [s.r, s.w])") == [[11, 80], [11, 75], [10, 70]], str(ev("W.sets[0].map(s => [s.r, s.w])")))
        ev("A.discardWorkout()")
        run()
        bad = []
        kinds = {'sube': 0, 'baja': 0, 'mantiene': 0}
        for k in range(60):
            lo = rnd.randint(3, 12)
            hi = lo + rnd.randint(2, 6)
            n = rnd.randint(1, 5)
            base = 2.5 * rnd.randint(2, 80)
            kind = rnd.choice(['tope', 'bajo', 'mezcla', 'azar'])
            last = []
            for j in range(rnd.randint(1, 5)):
                reps = hi + rnd.randint(0, 2) if kind == 'tope' else max(1, lo - rnd.randint(1, 2)) if kind == 'bajo' else (lo if j else hi) if kind == 'mezcla' else rnd.randint(1, hi + 3)
                w = base if rnd.random() < .6 else max(2.5, base - 2.5 * rnd.randint(1, 3))
                last.append([reps, w, rnd.choice([0, 7, 8, 9, 10]), 0])
            ev("""([ex, hist]) => { W = null; S.plan[0] = { n: 'Prueba', ex: [ex] }; S.exerciseHistory = hist; S.lastWeights = {}; R(); A.startWorkout(); }""",
               [{'n': 'Press banca', 's': n, 'rg': [lo, hi]}, {'Press banca': [{'d': '2026-11-05', 's': last}]}])
            got = ev("W.sets[0].map(s => [s.r, +s.w || 0])")
            want = expected(last, lo, hi, n)
            kinds['sube' if want[0][1] > last[0][1] else 'baja' if want[0][1] < last[0][1] else 'mantiene'] += 1
            if got != want:
                bad.append('%s %d-%d ×%d → %s (se esperaba %s)' % (last, lo, hi, n, got, want))
            ev("W = null")
        run()
        check('60 sesiones al azar: las series propuestas son las de la regla (suben %d, bajan %d, mantienen %d)' % (kinds['sube'], kinds['baja'], kinds['mantiene']),
              not bad and min(kinds.values()) >= 5, '; '.join(bad[:3]) + ' ' + str(kinds))

        set_day([{'n': 'Elevaciones laterales', 's': 3, 'rg': [10, 15]}], history={'Elevaciones laterales': [{'d': '2026-11-05', 's': [[12, 2, 0, 0], [12, 2, 0, 0], [12, 2, 0, 0]]}]})
        ev("S.deloadWeeks = { 1: 1 }; S.deloadSheetWeek = 1; saveState(); R()")
        start()
        got = ev("W.sets[0].map(s => s.w)")
        check('en la descarga, con mancuernas de 2 kg el peso baja (antes subía a 2,5 kg)', ev("!!W.deload") and got == [1.5, 1.5, 1.5], str(got))
        ev("A.discardWorkout(); S.deloadWeeks = {}; saveState()")
        run()
        set_day([{'n': 'Press militar barra', 's': 3, 'rg': [6, 10]}], history={'Press militar barra': [{'d': '2026-11-05', 's': [[8, 15, 0, 0]]}]})
        start()
        check('con menos peso que la barra no se proponen aproximaciones más pesadas que la serie', ev("!document.querySelector('.wup')") and 'movilidad' in text('#ex0'), text('#ex0')[:200])
        ev("A.discardWorkout()")
        set_day([{'n': 'Press militar barra', 's': 3, 'rg': [6, 10]}], history={'Press militar barra': [{'d': '2026-11-05', 's': [[8, 60, 0, 0]]}]})
        start()
        chips = ev("[...document.querySelectorAll('.wup .chip')].map(b => b.textContent)")
        check('y con 60 kg, de menos a más y todas por debajo', chips == ['10 × 20 kg', '8 × 30 kg', '5 × 42.5 kg', '2 × 50 kg'], str(chips))
        ev("A.discardWorkout()")
        run()

        print('Ejercicios propios')
        set_day([press], history={})
        n_custom = ev("S.customExercises.length")
        new_exercise = lambda name: (ev("A.openPicker()"), run(), ev("n => { document.querySelector('#xn').value = n; document.querySelector('[data-a=newExerciseSave]').click(); }", name), run())
        new_exercise('  press   BANCA ')
        check('crear uno con el nombre de uno de la librería no lo duplica', ev("S.customExercises.length") == n_custom and 'ya existe' in text('#tt'), text('#tt'))
        check('y añade al día el que ya existía', ev("S.plan[0].ex.map(e => e.n)") == ['Press banca', 'Press banca'])
        new_exercise('mi ejercício')
        check('ni con el de uno propio, sin mirar mayúsculas ni tildes', ev("S.customExercises.length") == n_custom and ev("S.plan[0].ex[2].n") == 'Mi ejercicio')
        new_exercise('Remo raro')
        check('uno nuevo sí se crea', ev("S.customExercises.length") == n_custom + 1 and ev("S.plan[0].ex[3].n") == 'Remo raro')
        ev("""(() => { S.exerciseHistory['Remo raro'] = [{ d: '2026-11-01', s: [[8, 40, 0, 0]] }, { d: '2026-10-20', s: [[8, 35, 0, 0]] }];
              S.records['Remo raro'] = { w: 40, r: 8, e: 40 * (1 + 8 / 30), d: '2026-11-01' }; S.lastWeights['Remo raro'] = 40; S.exerciseNotes['Remo raro'] = 'Agarre ancho';
              S.routines.push({ n: 'Con remo', bl: [{ ex: ['Remo raro', 'Press banca'], s: 3, r: 90 }] }); S.ownPrograms[0].plan[1].ex.push({ n: 'Remo raro', s: 3 }); saveState(); })()""")
        idx = lambda name: ev("n => exAll().findIndex(e => e.n == n)", name)
        ev("A.openLibrary(); A.exerciseDetail(%d)" % idx('Remo raro'))
        run(500)
        check('su ficha tiene «Renombrar» y «Eliminar»', 'EJERCICIO PROPIO' in text('#sh') and ev("!!document.querySelector('[data-a=customRenamePage]') && !!document.querySelector('[data-a=customDeleteAsk]')"))
        ev("A.exerciseDetail(%d)" % idx('Press banca'))
        run(500)
        check('la de uno de la librería, no', 'EJERCICIO PROPIO' not in text('#sh') and 'Press banca' in text('#sh'))
        rename = lambda old, new: (ev("A.customRenamePage(%d)" % idx(old)), run(), ev("n => { document.querySelector('#cxn').value = n; document.querySelector('[data-a=customRename]').click(); }", new), run(400))
        rename('Remo raro', 'press banca')
        check('no se puede renombrar al nombre de otro ejercicio', 'Ya hay un ejercicio' in text('#tt') and idx('Remo raro') >= 0, text('#tt'))
        rename('Remo raro', '   ')
        check('ni dejarlo sin nombre', 'Escribe un nombre' in text('#tt') and idx('Remo raro') >= 0, text('#tt'))
        rename('Remo raro', 'Remo en punta')
        moved = ev("""(() => { const o = 'Remo raro', n = 'Remo en punta'; return { lib: exAll().some(e => e.n == n) && !exAll().some(e => e.n == o),
            hist: (S.exerciseHistory[n] || []).length == 2 && !(o in S.exerciseHistory), rec: !!S.records[n] && S.records[n].w == 40 && !(o in S.records),
            last: S.lastWeights[n] == 40 && !(o in S.lastWeights), note: S.exerciseNotes[n] == 'Agarre ancho' && !(o in S.exerciseNotes),
            plan: S.plan[0].ex[3].n == n, routine: S.routines.some(r => r.bl.some(b => b.ex.includes(n))) && !S.routines.some(r => r.bl.some(b => b.ex.includes(o))),
            program: S.ownPrograms[0].plan[1].ex.some(e => e.n == n) && !S.ownPrograms[0].plan[1].ex.some(e => e.n == o) }; })()""")
        check('al renombrarlo, el nombre nuevo queda en la librería, el plan, los programas y los workouts', all(moved[k] for k in ('lib', 'plan', 'routine', 'program')), str(moved))
        check('y se lleva su historial, su récord, su último peso y sus notas', all(moved[k] for k in ('hist', 'rec', 'last', 'note')), str(moved))
        check('la ficha se abre ya con el nombre nuevo', 'Remo en punta' in text('#sh') and 'TU MEJOR MARCA' in text('#sh'), text('#sh')[:200])
        pg.reload()
        run(900)
        check('y sigue así al volver a abrir la app', idx('Remo en punta') >= 0 and idx('Remo raro') < 0 and len(hist('Remo en punta')) == 2)
        ev("A.openLibrary(); A.exerciseDetail(%d); " % idx('Remo en punta'))
        run(500)
        ev("A.customDeleteAsk(%d)" % idx('Remo en punta'))
        run()
        check('no se elimina mientras está en el plan, en un programa o en un workout', 'quítalo de donde está' in text('#dg') and 'está en un día de tu plan, un programa propio y un workout personalizado.' in text('#dg'), text('#dg'))
        ev("document.querySelector('#dg button').click()")
        ev("""(() => { const n = 'Remo en punta'; S.plan[0].ex = S.plan[0].ex.filter(e => e.n != n); S.ownPrograms[0].plan[1].ex = S.ownPrograms[0].plan[1].ex.filter(e => e.n != n);
              S.routines = S.routines.filter(r => !r.bl.some(b => b.ex.includes(n))); saveState(); })()""")
        ev("A.customDeleteAsk(%d)" % idx('Remo en punta'))
        run()
        check('al eliminarlo con historial, se puede conservar o borrar', 'Tiene 2 sesiones registradas' in text('#dg') and ev("[...document.querySelectorAll('#dg button')].map(b => b.textContent).join('|')") == 'Cancelar|Solo el ejercicio|Con su historial', text('#dg'))
        ev("[...document.querySelectorAll('#dg button')][1].click()")
        run(400)
        check('«Solo el ejercicio» lo quita de la librería y deja su historial', idx('Remo en punta') < 0 and len(hist('Remo en punta')) == 2 and 'Librería de ejercicios' in text('#sh'))
        new_exercise('Remo en punta')
        check('si se vuelve a crear con ese nombre, recupera su historial', idx('Remo en punta') >= 0 and len(hist('Remo en punta')) == 2)
        ev("S.plan[0].ex = S.plan[0].ex.filter(e => e.n != 'Remo en punta'); saveState(); A.openLibrary(); A.customDeleteAsk(%d)" % idx('Remo en punta'))
        run()
        ev("[...document.querySelectorAll('#dg button')][2].click()")
        run(400)
        gone = ev("""(() => { const n = 'Remo en punta'; return !exAll().some(e => e.n == n) && !(n in S.exerciseHistory) && !(n in S.records) && !(n in S.lastWeights) && !(n in S.exerciseNotes); })()""")
        check('«Con su historial» borra también su historial, su récord, su último peso y sus notas', gone)
        ev("sheet()")
        set_day([press], history={})
        start()
        ev("A.customDeleteAsk(%d)" % idx('Mi ejercicio'))
        run()
        check('con un entreno en curso no se toca un ejercicio', 'Termina o descarta antes el entreno en curso' in text('#tt') and idx('Mi ejercicio') >= 0 and ev("!document.querySelector('#dg').firstChild"))
        ev("A.discardWorkout()")
        run()

        print('Workouts propios y días')
        n_routines = ev("S.routines.length")
        ev("A.routineEditorBack()")
        run()
        ev("A.routineNew()")
        run()
        ev("backTarget().go()")  # «atrás» (el gesto o el botón del móvil) en el editor
        run()
        check('«atrás» en un workout sin crear pregunta si se descarta (antes lo dejaba vacío en la lista)', '¿Descartar este workout?' in text('#dg'), text('#dg'))
        ev("[...document.querySelectorAll('#dg button')][1].click()")
        run()
        check('y al descartarlo no queda en la lista', ev("S.routines.length") == n_routines)
        ev("A.routineNew()")
        run()
        pg.reload()
        run(900)
        check('uno que se dejó a medio crear al cerrar la app tampoco se queda', ev("S.routines.length") == n_routines and ev("S.routines.every(r => r.bl.length > 0)"), str(ev("S.routines.map(r => r.n)")))
        ev("A.routineEditorBack(); A.routineEdit(0)")
        run()
        ev("(e => { e.value = '   '; e.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('[data-c=routineName]'))")
        check('el nombre de un workout no se queda vacío', ev("S.routines[0].n") == 'Mi rutina' and ev("document.querySelector('[data-c=routineName]').value") == 'Mi rutina')
        for k in range(30):
            ev("document.querySelector('[data-a=routineBlockSets][data-v=\"1\"]').click()")
        check('ni un bloque pasa de 20 series', ev("S.routines[0].bl[0].s") == 20, str(ev("S.routines[0].bl[0].s")))
        ev("S.routines[0].bl[0].s = 3; saveState(); sheet()")
        set_day([press], history={})
        ev("A.openOverview(); A.overviewEdit()")
        run()
        ev("(e => { e.value = ''; e.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('[data-c=setDayName]'))")
        check('el nombre de un día tampoco', ev("S.plan[0].n") == 'Prueba' and ev("document.querySelector('[data-c=setDayName]').value") == 'Prueba')
        ev("document.querySelector('[data-a=removePlanExercise]').click()")
        run()
        ev("A.overviewEdit()")
        run()
        ev("[...document.querySelectorAll('#dg button')][1].click()")
        run()
        check('un día al que se le quitan todos los ejercicios no ofrece «Empezar entreno»', ev("!document.querySelector('[data-a=startWorkout]')") and 'Este día no tiene ejercicios' in text(), text()[:300])
        ev("A.startWorkout()")
        run()
        check('ni empieza un entreno vacío', ev("!W"))
        ev("A.overviewBack()")
        run()

        print('Borrar un registro')
        set_day([dict(press, s=2), curl], history={})
        ev("""(() => { S.logs = [{ d: '2026-10-05', n: 'Pierna', v: 500, s: 1, m: 40, q: 0, dl: 0 }, { d: '2026-10-06', n: 'Mañana', v: 300, s: 1, m: 20, q: 0, dl: 0 },
              { d: '2026-10-06', n: 'Tarde', v: 300, s: 1, m: 20, q: 0, dl: 0 }, { d: '2026-10-07', n: 'Cardio · Carrera', v: 0, s: 0, m: 30, q: 0, k: 'c', x: '5 km', c: { t: 'run', km: 5, sec: 1800 } }];
              S.exerciseHistory = { 'Sentadilla': [{ d: '2026-10-05', s: [[5, 100, 0, 0]] }], 'Prensa': [{ d: '2026-10-06', s: [[10, 30, 0, 0]] }],
                'Press banca': [{ d: '2026-10-01', s: [[5, 50, 0, 0]] }] };
              S.records = { 'Sentadilla': { w: 100, r: 5, e: 100 * (1 + 5 / 30), d: '2026-10-05' }, 'Press banca': { w: 50, r: 5, e: 50 * (1 + 5 / 30), d: '2026-10-01' } };
              S.lastWeights = { 'Sentadilla': 100, 'Prensa': 30, 'Press banca': 50 }; saveState(); })()""")
        start()
        do(0, 0, 8, 60)
        do(0, 1, 8, 62.5)
        do(1, 0, 10, 14)
        finish()
        check('el entreno y sus series llevan la misma marca', ev("(l => l.t > 0 && S.exerciseHistory['Press banca'][0].t === l.t && S.exerciseHistory['Curl martillo'][0].t === l.t)(S.logs[S.logs.length - 1])"))
        check('(el récord pasa a ser el de hoy)', ev("S.records['Press banca'].w") == 62.5 and ev("S.records['Press banca'].d") == today)
        ask = lambda name: (ev("A.openLogs(); A.logDeleteAsk(S.logs.findIndex(l => l.n == %s))" % json.dumps(name)), run(), text('#dg'))[2]
        yes = lambda: (ev("[...document.querySelectorAll('#dg button')][1].click()"), run())
        d = ask('Prueba')
        check('al borrar un entreno se avisa de que se borran sus series', 'También se borran sus series (2 ejercicios)' in d, d)
        yes()
        check('y se borran del historial de cada ejercicio', len(hist('Press banca')) == 1 and hist('Press banca')[0]['d'] == '2026-10-01' and not hist('Curl martillo'), str(hist('Press banca')))
        check('el récord vuelve a ser el de antes', ev("S.records['Press banca'].w") == 50 and ev("S.records['Press banca'].d") == '2026-10-01', str(ev("S.records['Press banca']")))
        check('y el último peso también', ev("S.lastWeights['Press banca']") == 50 and ev("!('Curl martillo' in S.lastWeights)"), str(ev("S.lastWeights")))
        d = ask('Pierna')
        yes()
        check('un entreno de antes de esta versión, solo ese día: se borran las series de ese día', '1 ejercicio' in d and not hist('Sentadilla') and ev("!S.records['Sentadilla'] && !('Sentadilla' in S.lastWeights)"), d)
        d = ask('Mañana')
        yes()
        check('con dos entrenos antiguos el mismo día no se sabe de cuál son: se avisa y se quedan', 'Sus series se quedan en el historial' in d and len(hist('Prensa')) == 1, d)
        d = ask('Tarde')
        yes()
        check('al borrar el otro, ya solo queda ese: se borran', '1 ejercicio' in d and not hist('Prensa'), d)
        d = ask('Cardio · Carrera')
        yes()
        check('un cardio no tiene series que borrar', 'series' not in d and ev("S.logs.length") == 0, d)
        ev("sheet()")
        run(300)

        check('sin errores de JavaScript', not errs, '; '.join(errs[:3]))
        c.close()
        b.close()
    print('\n%d comprobaciones, %d fallan' % (len(passes) + len(fails), len(fails)))
    print('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'dist', 'stratafit.html')))
