"""Dashboard, registros y copia (auditoría de la V1.0.3, fase 5): cada cifra y cada gráfica del Dashboard sale de los
registros de verdad. Con cinco meses de entrenos, cardio, WOD, pesajes e historial al azar (siempre los mismos: semilla
fija), lo que enseña la app se compara con la misma cuenta hecha aquí aparte.

- Resumen: entrenos totales, últimos 7 días, volumen total y kcal de hoy; el volumen de las 8 últimas sesiones.
- Calendario: los días marcados de este mes y del anterior. Esta semana: entrenos, días con entreno, racha y mejor racha.
- Récords personales (los 6 mejores por 1RM estimado) y línea de récords; progreso de un ejercicio en sus tres medidas.
- Cardio de la semana; evolución del peso (actual, máximo ganado y perdido, IMC) y su historial, con borrar; Registros.
- Nutrición de los 7 días anteriores: medias de kcal y proteína de los días anotados y días en objetivo.
- Estancamiento: con cuatro sesiones sin superar la mejor marca, avisa.
- Todo se pone al día al guardar un entreno y al borrarlo.
- Exportar: cada CSV tiene una fila por dato, con sus valores. Copia de seguridad: lo exportado, restaurado sobre otros
  datos, deja el estado idéntico al de antes.

  python3 tests/dashboard.py dist/stratafit.html
"""
import os, sys, json, math, random, datetime, zoneinfo, collections
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))
MADRID = zoneinfo.ZoneInfo('Europe/Madrid')
TODAY = datetime.date(2026, 11, 12)  # jueves
passes, fails = [], []


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


def check(name, cond, info=''):
    (passes if cond else fails).append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def jsround(x):
    """Math.round de JavaScript (la mitad, hacia arriba), sin el error de sumar 0,5 a un número que casi llega a la mitad."""
    f = math.floor(x)
    return f + 1 if x - f >= .5 else f


def num(x):
    """Un número como lo escribe JavaScript: 80, 82.5."""
    return str(int(x)) if float(x) == int(x) else repr(float(x))


def round1(x):
    return num(jsround(x * 10) / 10)


def clock(s):
    s = max(0, jsround(s))
    return '%d:%02d:%02d' % (s // 3600, s % 3600 // 60, s % 60) if s >= 3600 else '%d:%02d' % (s // 60, s % 60)


def day(n):
    return (TODAY - datetime.timedelta(days=n)).isoformat()


def monday(d):
    return d - datetime.timedelta(days=d.weekday())


def score(s):
    """1RM estimado (Epley) de una serie [repeticiones, peso, RPE, fila extra], o 0 si no cuenta para las marcas."""
    r, w, extra = s[0], s[1], s[3] if len(s) > 3 else 0
    return w * (1 + r / 30) if not extra and w > 0 and 1 <= r <= 30 else 0


def best_set(x):
    b = None
    for s in x['s']:
        e = score(s)
        if e > 0 and (b is None or e > b['e'] + 1e-6):
            b = {'w': s[1], 'r': s[0], 'e': e, 'd': x['d']}
    return b


def make_data(rnd):
    """Cinco meses de datos: entrenos de fuerza, cardio y WOD, historial de ocho ejercicios, pesajes y las comidas de hoy."""
    logs = []
    for n in range(150, -1, -1):
        if rnd.random() < .42:
            logs.append({'d': day(n), 'n': rnd.choice(['Pecho', 'Espalda', 'Pierna', 'Hombro']), 'v': rnd.randint(1500, 9000), 's': rnd.randint(8, 24), 'm': rnd.randint(30, 90),
                         'q': rnd.choice([0, 6.5, 7, 8, 9]), 'dl': 0})
        if rnd.random() < .12:
            km, sec = round(rnd.uniform(2, 15), 2), rnd.randint(900, 5400)
            logs.append({'d': day(n), 'n': 'Cardio · Carrera', 'v': 0, 's': 0, 'm': max(1, jsround(sec / 60)), 'q': 0, 'k': 'c', 'x': 'x', 'c': {'t': 'run', 'km': km, 'sec': sec}})
        if rnd.random() < .04:
            logs.append({'d': day(n), 'n': 'WOD · AMRAP 12 min', 'v': 0, 's': 0, 'm': 12, 'q': 0, 'k': 'w', 'x': '5 rondas', 'w': {'md': 'amrap', 'r': 5, 'e': 0}})
    hist = {}
    # (cada ejercicio, en su franja de pesos: así no hay empates entre ellos)
    for i, name in enumerate(['Press banca', 'Sentadilla', 'Remo con barra', 'Curl martillo', 'Press militar barra', 'Peso muerto rumano', 'Dominadas', 'Farmers carry 200 m']):
        days = sorted(rnd.sample(range(1, 150), rnd.randint(6, 14)))
        entries = []
        for n in days:  # del más reciente al más antiguo, como los guarda la app
            sets = []
            for j in range(rnd.randint(1, 5)):
                reps = 200 if 'Farmers' in name else rnd.choice([rnd.randint(1, 15), rnd.randint(1, 15), rnd.randint(28, 36), 0])
                sets.append([reps, 20 + 31 * i + 2.5 * rnd.randint(0, 12) + .25 * j, rnd.choice([0, 7, 8, 9]), 0])
                if rnd.random() < .15:  # un drop set debajo: más repeticiones con menos peso
                    sets.append([reps + 8, sets[-1][1] - 5, 0, 1, 'DS'])
            entries.append({'d': day(n), 's': sets})
        hist[name] = entries
    weights = [{'d': day(n), 'w': round(rnd.uniform(74, 86), 1)} for n in sorted(rnd.sample(range(0, 400), 25), reverse=True)]
    food = lambda: {'n': 'Alimento %d' % rnd.randint(1, 99), 'g': rnd.randint(20, 400), 'b': [rnd.randint(20, 600), round(rnd.uniform(0, 80), 1), round(rnd.uniform(0, 40), 1),
                                                                                         round(rnd.uniform(0, 30), 1), 0, 0]}
    # las comidas de hoy y de cinco de los siete días anteriores (uno de ellos, con casi nada: no cuenta como anotado)
    meals = {day(n): {str(i): [food() for _ in range(rnd.randint(1, 4))] for i in range(3)} for n in (0, 1, 2, 4, 5, 7)}
    meals[day(6)] = {'0': [{'n': 'Café', 'g': 100, 'b': [30, 3, 2, 1, 0, 0]}]}
    return logs, hist, weights, meals


def reload_by(pg, js, limit=10000):
    """Hace js, que recarga la app, y espera a que la página nueva haya arrancado."""
    pg.evaluate('window.__old = 1')
    try:
        pg.evaluate(js)
    except Exception:
        pass  # (la recarga puede llegar antes de que termine la evaluación)
    for _ in range(limit // 50):
        try:
            if pg.evaluate('!window.__old && !!window.__ffok'):
                return True
        except Exception:
            pass
        pg.wait_for_timeout(50)
    return False


# lo que enseña el Dashboard, sacado de la página
DASH = """(() => {
  const card = t => [...document.querySelectorAll('#app .cd')].find(c => c.querySelector('b') && c.querySelector('b').textContent == t);
  const rows = c => c ? [...c.querySelectorAll('.it')].map(r => [r.querySelector('span').firstChild.textContent, r.querySelector('.ta-r b').textContent, r.querySelector('.ta-r small').textContent, r.querySelector('span small').textContent]) : [];
  const stats = {};
  document.querySelectorAll('#app .g2 .cd').forEach(c => { if (c.querySelector('b.fs-26')) stats[c.querySelector('small').textContent] = c.querySelector('b').textContent; });
  const wk = document.querySelector('.wkc');
  const cardio = [...document.querySelectorAll('#app .cd')].find(c => c.querySelector('.f2cs'));
  return { stats, bars: [...card('Volumen por sesión').querySelectorAll('.bg-ac')].map(b => parseFloat(b.style.height)),
    cal: [...document.querySelectorAll('.cal i.on')].map(i => +i.textContent), calAll: [...document.querySelectorAll('.cal i')].filter(i => i.textContent).length,
    month: document.querySelector('.cal').previousElementSibling.querySelector('b').textContent,
    week: wk.querySelector('.row small').textContent, dots: [...wk.querySelectorAll('.wkd span')].map(s => s.classList.contains('on') ? 1 : 0), streak: [...wk.querySelectorAll('.wks b')].map(b => +b.textContent),
    records: rows(card('Récords personales')), timeline: rows(card('Línea de récords')),
    cardio: cardio ? { total: cardio.querySelector('.row small').textContent, now: [...cardio.querySelectorAll('.f2cs b')].map(b => b.textContent) } : null };
})()"""


def main(path):
    rnd = random.Random(20261113)
    logs, hist, weights, meals = make_data(rnd)
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
        pg.clock.run_for(300)
        ev = pg.evaluate
        run = lambda ms=300: pg.clock.run_for(ms)
        text = lambda sel='#app': ev("(e => e ? e.innerText : '')(document.querySelector(%s))" % json.dumps(sel))
        ev("""([logs, hist, weights, meals]) => { S.logs = logs; S.exerciseHistory = hist; S.weightLog = weights; S.meals = meals; S.week = 3; S.doneDays = {};
             S.records = { 'Dominadas': { w: 300, r: 5, e: 350, d: '2025-01-10' } }; S.biometrics = { sex: 'M', age: 30, h: 180, w: weights[weights.length - 1].w };
             S.tab = 2; saveState(); R(); }""", [logs, hist, weights, meals])
        run()
        dash = lambda: (ev("sheet(); S.tab = 2; R()"), run(), ev(DASH))[2]
        d = dash()

        print('Resumen')
        last7 = [l for l in logs if day(6) <= l['d'] <= day(0)]
        kcal = jsround(sum(it['b'][0] * it['g'] / 100 for m in meals[day(0)].values() for it in m))
        volume = sum(l['v'] for l in logs)
        want = {'Entrenos totales': str(len(logs)), 'Últimos 7 días': str(len(last7)), 'Volumen total': '%d t' % jsround(volume / 1000), 'kcal hoy': str(kcal)}
        check('entrenos totales, últimos 7 días, volumen total y kcal de hoy', d['stats'] == want, '%s ≠ %s' % (d['stats'], want))
        strength = [l for l in logs if not l.get('k')]
        top = max(l['v'] for l in strength[-8:])
        bars = [max(6, l['v'] / top * 100) for l in strength[-8:]]
        check('las columnas son el volumen de las 8 últimas sesiones de fuerza', len(d['bars']) == 8 and all(abs(a - b_) < .01 for a, b_ in zip(d['bars'], bars)), '%s ≠ %s' % (d['bars'], bars))

        print('Calendario y semana')
        in_month = lambda y, m: sorted({int(l['d'][8:]) for l in logs if l['d'].startswith('%04d-%02d' % (y, m))})
        check('en el calendario, los días de noviembre con algún registro', d['cal'] == in_month(2026, 11) and d['calAll'] == 30 and d['month'] == 'noviembre de 2026', '%s ≠ %s' % (d['cal'], in_month(2026, 11)))
        ev("document.querySelector('[data-a=calendarMonth][data-i=\"-1\"]').click()")
        run()
        d2 = ev(DASH)
        check('y los de octubre al pasar al mes anterior', d2['cal'] == in_month(2026, 10) and d2['calAll'] == 31 and d2['month'] == 'octubre de 2026', '%s ≠ %s' % (d2['cal'], in_month(2026, 10)))
        ev("document.querySelector('[data-a=calendarMonth][data-i=\"1\"]').click()")
        per_week = collections.Counter(monday(datetime.date.fromisoformat(l['d'])) for l in logs)
        m0 = monday(TODAY)
        wk = lambda k: per_week.get(m0 - datetime.timedelta(weeks=k), 0)
        goal = ev("S.plan.filter(d => d.ex.length).length")  # (un plan de 7 días: los entrenos de la semana son sus días con ejercicios)
        need = goal - 1 if goal >= 4 else goal
        streak = 1 if wk(0) >= need else 0
        k = 1
        while wk(k) >= need:
            streak += 1
            k += 1
        best = run_ = 0
        for i in range((m0 - min(per_week)).days // 7, -1, -1):
            if wk(i) >= need:
                run_ += 1
                best = max(best, run_)
            elif i > 0:
                run_ = 0
        days_on = [1 if any(l['d'] == (m0 + datetime.timedelta(days=i)).isoformat() for l in logs) else 0 for i in range(7)]
        check('esta semana: entrenos hechos frente a los del plan', d['week'] == '%d de %d entrenos' % (wk(0), goal), d['week'])
        check('los días de la semana con entreno', d['dots'] == days_on, '%s ≠ %s' % (d['dots'], days_on))
        check('la racha de semanas (con %d o más entrenos) y la mejor racha' % need, d['streak'] == [streak, max(best, streak)] and best >= 2, '%s ≠ %s' % (d['streak'], [streak, max(best, streak)]))

        print('Récords y progreso')
        marks = {}
        for name, entries in hist.items():
            if 'Farmers' in name:
                continue  # se mide en metros: no tiene 1RM
            b_ = {'w': 300, 'r': 5, 'e': 350, 'd': '2025-01-10'} if name == 'Dominadas' else None
            for x in entries:
                s = best_set(x)
                if s and (b_ is None or s['e'] > b_['e'] + 1e-6):
                    b_ = s
            if b_:
                marks[name] = b_
        top6 = sorted(marks.items(), key=lambda kv: -kv[1]['e'])[:6]
        want = [[n, '%s kg × %s' % (num(m['w']), num(m['r'])), '1RM est. %d kg' % jsround(m['e']), m['d']] for n, m in top6]
        check('récords personales: los 6 mejores por 1RM estimado, con la marca guardada si es mejor', d['records'] == want, '%s\n ≠ %s' % (d['records'], want))
        check('sin el ejercicio que se mide en metros y con todos de 1 a 30 repeticiones', all('Farmers' not in r[0] and 1 <= float(r[1].split('× ')[1]) <= 30 for r in d['records']))
        events = []
        for name, entries in hist.items():
            if 'Farmers' in name:
                continue
            b_ = 0
            for x in reversed(entries):
                s = best_set(x)
                if not s:
                    continue
                if b_ > 0 and s['e'] > b_ + 1e-6:
                    events.append((x['d'], s['e'], name, s))
                b_ = max(b_, s['e'])
        events.sort(key=lambda e: (e[0], e[1]), reverse=True)
        want = [[e[2], '%s kg × %s' % (num(e[3]['w']), num(e[3]['r']))] for e in events[:8]]
        check('línea de récords: las 8 últimas veces que una sesión mejoró el 1RM estimado', [r[:2] for r in d['timeline']] == want, '%s\n ≠ %s' % ([r[:2] for r in d['timeline']], want))
        entries = list(reversed(hist['Press banca']))
        series = {'e': [max([score(s) for s in x['s']] + [0]) for x in entries], 'w': [max([s[1] for s in x['s'] if not s[3]] + [0]) for x in entries],
                  'v': [sum(s[0] * s[1] for s in x['s']) for x in entries]}
        ev("""(() => { const s = document.querySelector('[data-c=progressExercise]'); s.value = [...s.options].findIndex(o => o.textContent == 'Press banca');
              s.dispatchEvent(new Event('change', { bubbles: true })); })()""")
        for m, label in (('e', '1RM estimado'), ('w', 'Peso máximo'), ('v', 'Volumen')):
            ev("document.querySelector('[data-a=progressMetric][data-v=%s]').click()" % m)
            run()
            pts = [v for v in series[m] if v > 0][-30:]
            fmt = (lambda v: '%d kg' % jsround(v)) if m == 'v' else (lambda v: round1(v) + ' kg')
            got = ev("({ now: document.querySelector('#pgc .pgt2 b').textContent, what: document.querySelector('#pgc .pgt2 small').textContent, n: document.querySelectorAll('#pgc circle[data-a=progressPeriod]').length, sum: document.querySelector('#pgc .pgsum').textContent })")
            change = (pts[-1] - pts[0]) / pts[0] * 100
            line = 'De %s a %s · %s%s %%' % (fmt(pts[0]), fmt(pts[-1]), '+' if change >= 0 else '', num(jsround(change * 10) / 10))
            check('progreso de Press banca, %s: un punto por sesión, el último valor y el cambio' % label.lower(),
                  got['n'] == len(pts) and got['now'] == fmt(pts[-1]) and got['what'].startswith(label) and got['sum'].startswith(line), '%s ≠ %d puntos, %s, %s' % (got, len(pts), fmt(pts[-1]), line))

        print('Cardio, peso y registros')
        cardio = [l for l in logs if l.get('k') == 'c']
        this_week = [l for l in cardio if monday(datetime.date.fromisoformat(l['d'])) == m0]
        km = lambda ls: num(jsround(sum(round(l['c']['km'] * 100) for l in ls) / 10) / 10)  # (en centésimas, que son enteros: sin errores de decimales)
        want = {'total': km(cardio) + ' km en total', 'now': [km(this_week), clock(sum(l['c']['sec'] for l in this_week)), str(len(this_week))]}
        check('cardio: kilómetros en total y los de esta semana, con su tiempo y sus sesiones', d['cardio'] == want, '%s ≠ %s' % (d['cardio'], want))
        ev("A.openWeight()")
        run()
        page = text()
        by_date = sorted(weights, key=lambda p_: p_['d'])
        cur, first, allw = by_date[-1]['w'], by_date[0]['w'], [p_['w'] for p_ in by_date]
        bmi = cur / 1.8 ** 2
        want = ['Actual: %s kg' % num(cur), '+%.1f kg' % max(0, max(allw) - first), '−%.1f kg' % max(0, first - min(allw)), 'IMC %.1f' % bmi]
        check('peso: el actual, lo más ganado y perdido desde el primero y el IMC', all(w in page for w in want), '%s en %s' % (want, page[page.find('Actual'):][:200]))
        check('con su historial, del más reciente al más antiguo', 'Historial (%d)' % len(weights) in page and ev("[...document.querySelectorAll('[data-a=weightDeleteAsk]')].map(r => r.dataset.v)") == [p_['d'] for p_ in reversed(by_date)])
        ev("document.querySelector('[data-a=weightDeleteAsk]').click()")
        run()
        check('al tocar un pesaje se pregunta antes de borrarlo', '¿Borrar este pesaje?' in text('#dg') and num(cur) + ' kg' in text('#dg'), text('#dg'))
        ev("[...document.querySelectorAll('#dg button')][1].click()")
        run()
        check('y al borrarlo, el peso actual y el del perfil pasan a ser los del anterior', 'Actual: %s kg' % num(by_date[-2]['w']) in text() and ev("S.biometrics.w") == by_date[-2]['w'] and ev("S.weightLog.length") == len(weights) - 1,
              text()[text().find('Actual'):][:60])
        ev("(w => { S.weightLog.push(w); S.biometrics.w = w.w; saveState(); A.weightBack(); })(%s)" % json.dumps(by_date[-1]))
        ev("A.openLogs()")
        run()
        got = ev("[...document.querySelectorAll('#sh .cd b.fs-22')].map(b => b.textContent)")
        want = [str(len(logs)), round1(volume / 1000) + ' t', round1(sum(l['m'] for l in logs) / 60) + ' h']
        check('registros: entrenos, volumen y tiempo totales', got == want, '%s ≠ %s' % (got, want))
        check('y una fila por registro', ev("document.querySelectorAll('#sh [data-a=logDeleteAsk]').length") == len(logs))

        print('Nutrición de los 7 días anteriores')
        dash()
        goals = ev("S.nutritionGoals")
        days_ = [[sum(it['b'][i] * it['g'] / 100 for m in meals.get(day(n), {}).values() for it in m) for i in range(4)] for n in range(1, 8)]
        on = [t for t in days_ if t[0] > 50]
        in_goal = sum(1 for t in on if abs(t[0] - goals['k']) <= goals['k'] * .1)
        card = text('.nwr')
        want = ['Hasta ayer, %d de 7 anotados' % len(on), '%d\nkcal de media\nObjetivo %d' % (jsround(sum(t[0] for t in on) / len(on)), goals['k']),
                '%d g\nproteína de media\nObjetivo %d g' % (jsround(sum(t[2] for t in on) / len(on)), jsround(goals['k'] * goals['p'] / 400)), '%d de %d\ndías en objetivo' % (in_goal, len(on))]
        check('la media de kcal y de proteína de los días anotados y cuántos quedaron en objetivo', len(on) == 5 and all(w in card for w in want), '%s en %s' % (want, card))
        ev("scrollTo(0, 400); document.querySelector('.nwr').click()")
        run()
        check('al tocarla se va a Nutrición, al día de hoy y arriba', ev("S.tab == 1 && nutriDayOffset == 0 && scrollY == 0"))

        print('Estancamiento')
        stuck = [{'d': day(n), 's': [[8, w, 0, 0]]} for n, w in ((2, 80), (9, 80), (16, 80), (23, 85), (30, 80))]
        ev("h => { S.exerciseHistory = { 'Press banca': h }; S.stagnationDismissed = {}; saveState(); }", stuck)
        dash()
        # (con textContent: las filas que quedan fuera de la pantalla no se pintan, content-visibility, y innerText no las da)
        rows_ = ev("[...document.querySelectorAll('[data-a=stagnationInfo]')].map(r => r.textContent)")
        check('con tres sesiones sin superar la mejor marca (y tres semanas), avisa', 'Posible estancamiento' in text() and rows_ == ['Press bancaSin récord en 3 sesiones›'], str(rows_))
        ev("h => { S.exerciseHistory = { 'Press banca': h }; saveState(); }", [{'d': day(1), 's': [[8, 90, 0, 0]]}] + stuck)
        dash()
        check('y deja de avisar al superarla', 'Posible estancamiento' not in text())
        ev("h => { S.exerciseHistory = h; saveState(); }", hist)

        print('Al cambiar los registros')
        ev("""(() => { sheet(); W = null; S.plan[0] = { n: 'Prueba', ex: [{ n: 'Press banca', s: 2, rg: [8, 12] }] }; S.selectedDay = 0; S.selectedWeekday = 0; S.tab = 0; R(); A.startWorkout();
              W.sets[0].forEach(s => { s.r = 10; s.w = 100; s.ws = 0; s.ok = 1; }); A.finishSave(); })()""")
        run(500)
        after = dash()
        check('al guardar un entreno suben los entrenos, los últimos 7 días y el volumen', after['stats']['Entrenos totales'] == str(len(logs) + 1) and after['stats']['Últimos 7 días'] == str(len(last7) + 1)
              and after['stats']['Volumen total'] == '%d t' % jsround((volume + 2000) / 1000), str(after['stats']))
        check('hoy queda marcado en el calendario y en la semana', 12 in after['cal'] and after['dots'][3] == 1 and after['week'].startswith('%d de' % (wk(0) + 1)), '%s %s %s' % (after['cal'], after['dots'], after['week']))
        check('y su columna es la última de las 8', abs(after['bars'][-1] - max(6, 2000 / max(2000, max(l['v'] for l in strength[-7:])) * 100)) < .01, str(after['bars']))
        ev("A.openLogs(); A.logDeleteAsk(S.logs.length - 1)")
        run()
        ev("[...document.querySelectorAll('#dg button')][1].click()")
        run()
        back = dash()
        check('al borrarlo, todo vuelve a como estaba', back == d, json.dumps({k: [back[k], d[k]] for k in d if back[k] != d[k]}, ensure_ascii=False)[:400])

        print('Exportar (CSV)')
        ev("""(() => { window.__blobs = []; const o = URL.createObjectURL; URL.createObjectURL = b => { window.__blobs.push(b); return o.call(URL, b); }; })()""")

        def csv(kind):
            ev("A.openCsvExport()")
            run(400)
            ev("document.querySelector('[data-a=csvDownload][data-v=%s]').click()" % kind)
            run(300)
            pg.wait_for_timeout(100)
            t = ev("window.__blobs[window.__blobs.length - 1].text()")
            return [r.split(';') for r in t.lstrip('﻿').strip('\r\n').split('\r\n')]

        es = lambda x: num(jsround(x * 100) / 100).replace('.', ',')
        rows = csv('ent')
        kinds = lambda l: 'Cardio' if l.get('k') == 'c' else 'WOD' if l.get('k') == 'w' else 'Fuerza'
        check('entrenos: una fila por registro, con su fecha, tipo, series, volumen y minutos', len(rows) == len(logs) + 1
              and [r[:2] + r[3:6] for r in rows[1:]] == [[l['d'], kinds(l), es(l['s']), es(l['v']), es(l['m'])] for l in sorted(logs, key=lambda l: l['d'])], str(rows[:3]))
        rows = csv('ser')
        want = [[x['d'], n, str(i + 1), es(s[0]), es(s[1])] for n in sorted(hist) for x in reversed(hist[n]) for i, s in enumerate(x['s'])]
        check('series: una fila por serie del historial, con repeticiones y peso', [r[:5] for r in rows[1:]] == want, '%d filas ≠ %d' % (len(rows) - 1, len(want)))
        check('con el drop set marcado como tal', sum(1 for r in rows[1:] if r[6] == 'DS') == sum(1 for n in hist for x in hist[n] for s in x['s'] if s[3] == 1))
        rows = csv('peso')
        check('peso corporal: una fila por pesaje, por fecha', rows[1:] == [[p_['d'], es(p_['w'])] for p_ in by_date], str(rows[:3]))
        rows = csv('car')
        check('cardio: una fila por sesión, con sus kilómetros y minutos', [r[:4] for r in rows[1:]] == [[l['d'], 'Carrera', es(l['c']['km']), es(jsround(l['c']['sec'] / 60 * 10) / 10)] for l in cardio], str(rows[:3]))
        rows = csv('com')
        items = [[d_, it] for d_ in sorted(meals) for i in sorted(meals[d_]) for it in meals[d_][i]]
        check('comidas: una fila por alimento, con sus gramos y kcal', [[r[0], r[2], r[3], r[4]] for r in rows[1:]] == [[d_, it['n'], es(it['g']), str(jsround(it['b'][0] * it['g'] / 100))] for d_, it in items], str(rows[:3]))
        ev("sheet()")

        print('Copia de seguridad')
        ev("A.openAchievements && A.openAchievements(); sheet(); saveState()")  # (los logros que tocaban, ya dados antes de la copia)
        run(600)
        pg.reload()  # (lo guardado, tal como lo deja la app al arrancar: cada entreno con su id y sin restos de versiones de prueba)
        run(900)
        before = json.loads(ev("JSON.stringify(stateToStored(S))"))
        backup = ev("buildBackup()")
        parsed = ev("t => { const r = parseBackup(t); return { fix: r.fix, same: JSON.stringify(r.s) == JSON.stringify(stateToStored(S)), sum: r.meta.sum.join(' | ') }; }", backup)
        check('la copia lleva el estado entero y se lee sin nada dañado', parsed['same'] and parsed['fix'] == 0, str(parsed)[:200])
        check('y dice lo que contiene', '%d entrenos registrados' % len(logs) in parsed['sum'] and 'Historial de pesos de 8 ejercicios' in parsed['sum'] and '25 registros de peso corporal' in parsed['sum'], parsed['sum'][:300])
        # otros datos encima (como en otro móvil, o tras borrar por error) y se restaura la copia
        ev("S.logs = S.logs.slice(0, 3); S.exerciseHistory = {}; S.meals = {}; S.weightLog = []; S.routines = []; S.customExercises = []; S.records = {}; S.units = 'lb'; S.week = 9; saveState()")
        run(300)
        ok = reload_by(pg, "(t => { pendingRestore = parseBackup(t); restoreBackup(); })(%s)" % json.dumps(backup))
        pg.clock.run_for(900)
        after = json.loads(ev("JSON.stringify(stateToStored(S))"))
        # (lo único que cambia: cuándo se hizo la última copia o restauración)
        diff = sorted(k for k in set(before) | set(after) if k != 'bkd' and before.get(k) != after.get(k))
        check('restaurada sobre otros datos, deja el estado idéntico al de antes', ok and not diff, 'cambia: %s' % ', '.join('%s (%s → %s)' % (k, json.dumps(before.get(k))[:60], json.dumps(after.get(k))[:60]) for k in diff[:6]))
        ev("document.querySelector('#dg').innerHTML = ''; sheet()")
        d4 = dash()
        check('y el Dashboard enseña lo mismo', d4 == d, json.dumps({k: [d4[k], d[k]] for k in d if d4[k] != d[k]}, ensure_ascii=False)[:400])

        check('sin errores de JavaScript', not errs, '; '.join(errs[:3]))
        c.close()
        b.close()
    print('\n%d comprobaciones, %d fallan' % (len(passes) + len(fails), len(fails)))
    print('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'dist', 'stratafit.html')))
