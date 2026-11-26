"""Entrenos a la carta (V1.0.4): la última tarjeta de Workout, la lista de las diez rutinas, su vista previa y el entreno.

- La tarjeta: la última de los atajos, con su nombre, su línea y la mancuerna en trazo.
- La lista: las diez rutinas en su orden, con su nivel (solo donde lo da la rutina), su subtítulo y sus cifras.
- La vista previa: los bloques (suelto, superserie, triserie, serie gigante), las series y repeticiones de cada posición
  (pirámides, AMRAP), el tempo si lo da y la variante.
- El entreno: su día va sobre el del plan; cada ejercicio con sus repeticiones serie a serie, su tempo (Libre si la rutina no
  lo da), su variante y su bloque; el objetivo sin RIR; la serie gigante con su nombre y los descansos de bloque (10 s y el
  de la ronda); una serie AMRAP sale en blanco y no se da por hecha hasta apuntar las repeticiones, ni con su ✓ ni con
  «Siguiente serie»; se guarda con el nombre de la rutina y lo hecho, vuelve el día del plan tal cual y no lo completa.
- Reanudar: un entreno a la carta a medias, tras cerrar la app, sigue con su rutina.
- En inglés: la tarjeta, la lista, la vista previa y el aviso de las AMRAP.

  python3 tests/ondemand.py dist/stratafit.html
"""
import os, sys, datetime, zoneinfo
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
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else str(info)[:500]))


def page(b, path, locale, errs):
    c = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Madrid', locale=locale, **context_opts(path))
    c.add_init_script(rd('init.js'))
    pg = c.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.clock.install(time=datetime.datetime(2026, 11, 12, 10, 0, tzinfo=MADRID))
    pg.goto(app_url(path))
    pg.clock.run_for(800)
    pg.evaluate(rd('seed.js'))
    pg.clock.run_for(300)
    return pg


def main(path):
    errs = []
    with sync_playwright() as p:
        b = launch(p)
        pg = page(b, path, 'es-ES', errs)
        ev = pg.evaluate
        run = lambda ms=400: pg.clock.run_for(ms)
        text = lambda sel='body': ev("(e=>e?e.innerText:'')(document.querySelector(%r))" % sel)
        click = lambda sel, ms=500: (ev("document.querySelector(%r).click()" % sel), run(ms))
        typed = lambda sel, v: (ev("(e=>{e.value=%r;e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector(%r))" % (str(v), sel)), run(200))
        home = lambda: (ev("W&&A.discardWorkout();sheet();S.tab=0;R()"), run())

        print('La tarjeta')
        home()
        tiles = ev("[...document.querySelectorAll('.hub-tile')].map(t=>[t.dataset.a,t.querySelector('b').innerText,t.querySelector('small').innerText,t.querySelectorAll('svg rect').length])")
        check('la última de los atajos de Workout, con su nombre, su línea y la mancuerna en trazo', len(tiles) == 5 and tiles[-1] == ['openOnDemand', 'Entrenos a la carta', 'Elige tu sesión y empieza a entrenar', 4], str(tiles))

        print('La lista')
        click('[data-a=openOnDemand]', 700)
        cards = ev("[...document.querySelectorAll('#sh .od-card')].map(c=>c.innerText.replace(/\\s+/g,' ').trim())")
        check('las diez rutinas, en su orden', len(cards) == 10 and cards[0].find('Armageddon') >= 0 and 'Back Builder' in cards[8] and 'Dynamic Warm-Up' in cards[9], str(cards[:2]))
        check('cada una con sus cifras (Chest Crusher: 7 ejercicios y 28 series)', '7 ejercicios · 28 series' in cards[2], cards[2])
        check('el nivel, solo donde lo da la rutina', 'Avanzado' in cards[0] and 'Avanzado' not in cards[2] and 'Principiante' in cards[9], str(cards))
        check('el calentamiento, con su subtítulo', 'Calentamiento dinámico' in cards[9], cards[9])
        check('se lee: cada tarjeta, un botón', ev("[...document.querySelectorAll('#sh .od-card')].every(c=>c.getAttribute('role')=='button'&&c.tabIndex==0)"))

        print('La vista previa')
        click('#sh .od-card[data-i="2"]', 700)
        heads = ev("[...document.querySelectorAll('#sh .row.mt-14')].map(r=>r.innerText.replace(/\\s+/g,' ').trim())")
        check('sus bloques: suelto, superserie y serie gigante', heads == ['SERIE A', 'SERIE B Superserie', 'SERIE C Serie gigante'], str(heads))
        rows = ev("[...document.querySelectorAll('#sh .exercise-row')].map(r=>r.innerText.replace(/\\s+/g,' ').trim())")
        check('una pirámide, serie a serie; sin tempo si la rutina no lo da', rows[0] == 'Press inclinado barra 4 series · 12/10/8/6 reps', str(rows[:1]))
        check('las posiciones repetidas, cada una con su tempo', rows[1].endswith('Tempo 3/0/3/0') and rows[2].endswith('Tempo 3/0/1/0'), str(rows[1:3]))
        check('la variante y las AMRAP', rows[3] == 'Press inclinado mancuernas Agarre prono 4 series · 10 reps · Tempo 4/0/1/0' and rows[4] == 'Press declinado mancuernas Agarre prono 4 series · AMRAP', str(rows[3:5]))
        check('y «Empezar entreno»', ev("!!document.querySelector('#sh [data-a=onDemandStart][data-i=\"2\"]')"))

        print('El entreno')
        sel0 = ev("S.selectedDay")
        plan0 = ev("JSON.stringify(S.plan[S.selectedDay])")
        # (el día de hoy, sin hacer: así se ve si el entreno a la carta lo completa)
        ev("delete S.doneDays[S.week+'-'+S.selectedWeekday];saveState()")
        done0 = ev("JSON.stringify(S.doneDays)")
        logs0 = ev("S.logs.length")
        click('#sh [data-a=onDemandStart]', 900)
        check('empieza, con su día puesto sobre el del plan', ev("!!W && S.plan[S.selectedDay].od=='stratafit-routine-03' && !!S.planBackup && JSON.stringify(S.planBackup.day)==%r" % plan0))
        day = ev("S.plan[S.selectedDay].ex.map(e=>[e.n,e.s,(e.rs||[]).join('/'),e.t,e.nt||'',e.b||0])")
        A4 = 'AMRAP/AMRAP/AMRAP/AMRAP'
        check('cada ejercicio con sus series, repeticiones, tempo, variante y bloque', day == [
            ['Press inclinado barra', 4, '12/10/8/6', 'Libre', '', 0], ['Pec deck', 4, '10/10/10/10', '3/0/3/0', '', 2], ['Pec deck', 4, '10/10/10/10', '3/0/1/0', '', 2],
            ['Press inclinado mancuernas', 4, '10/10/10/10', '4/0/1/0', 'Agarre prono', 3], ['Press declinado mancuernas', 4, A4, 'Libre', 'Agarre prono', 3],
            ['Press banca mancuernas', 4, A4, 'Libre', 'Agarre prono', 3], ['Fondos en banco', 4, A4, 'Libre', '', 3]], str(day))
        h0 = text('#ex0 .exercise-head')
        check('el objetivo, serie a serie, sin RIR y con «Tempo Libre»', 'Objetivo: 4 × 12/10/8/6 reps' in h0 and 'RIR' not in h0 and 'Tempo Libre' in h0, h0)
        check('cada serie, con sus repeticiones', ev("[...document.querySelectorAll('#ex0 [data-c=setReps]')].map(i=>i.value)") == ['12', '10', '8', '6'])
        check('la variante, bajo el nombre', ev("document.querySelector('#ex3 .ex-variant').innerText") == 'Agarre prono' and not ev("!!document.querySelector('#ex0 .ex-variant')"))
        check('la serie gigante, con su nombre', 'SERIE GIGANTE · 1/4' in text('#ex3') and 'SERIE GIGANTE · 4/4' in text('#ex6'), text('#ex3')[:80])
        check('su tempo, elegido en su desplegable aunque no esté en la lista', ev("document.querySelector('#ex3 select[data-c=setPlanTempo]').value") == '4/0/1/0')
        rest = ev("[3,4,5,6].map(i=>document.querySelector('#ex'+i+' .set-row span.fs-13').innerText)")
        check('dentro del bloque, 10 s; al acabar la ronda, el de la ronda (2:30)', rest == ['0:10', '0:10', '0:10', '2:30'], str(rest))

        print('Las series AMRAP')
        amr = ev("(i=>[i.value,i.placeholder])(document.querySelector('#ex4 [data-c=setReps][data-j=\"0\"]'))")
        check('salen en blanco, con «AMRAP»', amr == ['', 'AMRAP'], str(amr))
        click('#ex4 [data-a=toggleSetDone][data-j="0"]', 300)
        check('sin apuntar las repeticiones no se dan por hechas, y se dice por qué', ev("!W.sets[4][0].ok") and 'Apunta las repeticiones que has hecho' in text('#tt'), text('#tt'))
        typed('#ex4 [data-c=setReps][data-j="0"]', 14)
        click('#ex4 [data-a=toggleSetDone][data-j="0"]', 300)
        check('apuntadas, sí', ev("!!W.sets[4][0].ok && W.sets[4][0].r==14"))
        # lo que va antes en la ronda, hecho: la que toca es la AMRAP del press de banca (serie gigante: por rondas)
        ev("[0,1,2].forEach(i=>W.sets[i].forEach(s=>{s.ok=1;s.w=s.w||20}));W.sets[3][0].ok=1;W.restEndsAt=0;R()")
        run()
        ev("A.goToNextSet()")
        run(300)
        check('con «Siguiente serie», tampoco', ev("!W.sets[5][0].ok") and 'Apunta las repeticiones' in text('#tt'))
        ev("document.querySelector('#ex5 [data-c=setReps][data-j=\"0\"]').value='11'")
        ev("A.goToNextSet()")
        run(300)
        check('escritas en su casilla (aunque no se haya salido de ella), sí', ev("!!W.sets[5][0].ok && W.sets[5][0].r==11"))

        print('Guardar')
        ev("A.finishSave()")
        run(800)
        log = ev("S.logs[S.logs.length-1]")
        check('se guarda con el nombre de la rutina', ev("S.logs.length") == logs0 + 1 and log['n'] == 'Chest Crusher', str(log))
        check('las AMRAP, con las repeticiones apuntadas', ev("S.exerciseHistory['Press declinado mancuernas'][0].s.map(x=>x[0])") == [14] and ev("S.exerciseHistory['Press banca mancuernas'][0].s.map(x=>x[0])") == [11])
        check('vuelve el día del plan, tal cual', ev("S.selectedDay") == sel0 and ev("JSON.stringify(S.plan[%d])" % sel0) == plan0 and ev("!S.planBackup"))
        check('y no lo da por hecho', ev("JSON.stringify(S.doneDays)") == done0, done0 + ' → ' + ev("JSON.stringify(S.doneDays)"))
        ev("sheet()")
        run()

        print('Reanudar')
        home()
        ev("A.onDemandStart(0)")
        run(800)
        typed('#ex0 [data-c=setWeight][data-j="0"]', 30)
        click('#ex0 [data-a=toggleSetDone][data-j="0"]', 300)
        ev("R()")
        run()
        pg.reload()
        run(1200)
        check('tras cerrar la app, sale el entreno a medias', 'ENTRENO EN CURSO' in text() and 'Armageddon' in text(), text()[:200])
        ev("A.resumeWorkout()")
        run(600)
        check('y sigue con su rutina: repeticiones, variante y bloques', ev("S.plan[S.selectedDay].od=='stratafit-routine-01' && S.plan[S.selectedDay].ex[1].nt=='En banco inclinado' && S.plan[S.selectedDay].ex[0].rs.join('/')=='12/10/8/6' && !!W.sets[0][0].ok"))
        check('la triserie, con su nombre', 'TRISERIE · 1/3' in text('#ex4') and 'SUPERSERIE · 1/2' in text('#ex0'), text('#ex4')[:60])
        ev("A.discardWorkout()")
        run()
        check('al descartarlo, vuelve el día del plan', ev("!W && !S.planBackup && JSON.stringify(S.plan[%d])" % sel0) == plan0)

        print('El calentamiento y las rutinas de ejercicios sueltos')
        home()
        ev("A.onDemandStart(9)")
        run(800)
        check('el calentamiento: cinco ejercicios de una serie, sin bloques', ev("S.plan[S.selectedDay].ex.map(e=>e.n+':'+e.s+':'+(e.b||0)).join(',')") == 'Inchworm:1:0,Zancada con rotación torácica:1:0,Rodilla al pecho con alcance:1:0,Talón al glúteo con alcance:1:0,Saltos de gemelo:1:0')
        check('cada uno con su figura', ev("[...document.querySelectorAll('.exercise .thumb')].length") == 5)
        ev("A.discardWorkout()")
        run()
        ev("A.onDemandStart(3)")
        run(800)
        check('Leg Destroyer: ocho ejercicios sueltos, sin superseries', ev("S.plan[S.selectedDay].ex.length==8 && S.plan[S.selectedDay].ex.every(e=>e.b==null)") and 'SUPERSERIE' not in text() and 'SERIE GIGANTE' not in text())
        check('el hack, 4 × 12 con su variante', 'Objetivo: 4 × 12 reps' in text('#ex1 .exercise-head') and 'Pies a media anchura' in text('#ex1 .exercise-head'), text('#ex1 .exercise-head'))
        ev("A.discardWorkout()")
        run()
        check('sin errores', not errs, str(errs[:3]))

        print('En inglés')
        en = page(b, path, 'en-US', errs)
        ev2 = en.evaluate
        run2 = lambda ms=400: en.clock.run_for(ms)
        ev2("S.tab=0;R()")
        run2()
        t = ev2("(t=>[t.querySelector('b').innerText,t.querySelector('small').innerText])(document.querySelector('.hub-tile[data-a=openOnDemand]'))")
        check('la tarjeta: «On-Demand Workouts», «Pick your session and start training»', t == ['On-Demand Workouts', 'Pick your session and start training'], str(t))
        ev2("A.openOnDemand()")
        run2(600)
        page_t = ev2("document.querySelector('#sh').innerText")
        check('la lista, en inglés', 'On-Demand Workouts' in page_t and 'Dynamic warm-up' in page_t and '7 exercises · 28 sets' in page_t and 'Advanced' in page_t and 'Beginner' in page_t, page_t[:300])
        ev2("A.onDemandShow(2)")
        run2(600)
        page_t = ev2("document.querySelector('#sh').innerText")
        check('la vista previa: la serie gigante, la variante y las AMRAP', 'Giant set' in page_t and 'Pronated grip' in page_t and '4 sets · AMRAP' in page_t and 'Start workout' in page_t, page_t[:400])
        ev2("A.onDemandStart(2)")
        run2(800)
        ev2("document.querySelector('#ex4 [data-a=toggleSetDone][data-j=\"0\"]').click()")
        run2(300)
        check('el aviso de las AMRAP', 'Enter the reps you did' in ev2("document.querySelector('#tt').innerText"))
        check('sin errores', not errs, str(errs[:3]))
        b.close()
    print('\n%d comprobaciones, %d fallos' % (len(passes) + len(fails), len(fails)))
    if fails:
        print('FALLAN:', '; '.join(fails))
        sys.exit(1)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'dist', 'stratafit.html'))
