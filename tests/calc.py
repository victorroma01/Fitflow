"""Cálculos y validación de lo que se escribe (auditoría de la V1.0.3): lo que la app suma y enseña se compara con la misma
cuenta hecha aquí aparte, con datos al azar (siempre los mismos: semilla fija), y se prueba que un número imposible no entra.

- Nutrición: el total del día y el de cada comida son la suma de sus alimentos (kcal y macros), también con comidas fuera del
  reparto del día; coincide con las kcal de hoy del Dashboard; los gramos, un alimento nuevo, el peso y los datos biométricos
  solo admiten valores posibles; los objetivos calculados (Mifflin-St Jeor) cuadran y sus porcentajes suman 100.
- Fechas: el día anterior y el siguiente van por calendario, también en los cambios de hora (zona Europe/Madrid).
- Entreno: el volumen guardado es la suma de repeticiones × peso de las series hechas (en kg y en lb), el 1RM estimado es el
  de Epley, y una serie no admite números negativos.

  python3 tests/calc.py dist/stratafit.html
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


def macros(it):
    return [it['b'][i] * it['g'] / 100 for i in range(4)]


def total(items):
    return [sum(macros(it)[i] for it in items) for i in range(4)]


def main(path):
    rnd = random.Random(20261112)
    errs = []
    with sync_playwright() as p:
        b = launch(p)

        def device(when):
            c = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Madrid', locale='es-ES', **context_opts(path))
            c.add_init_script(rd('init.js'))
            pg = c.new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            # (la hora es la de Madrid, sea cual sea la zona del ordenador que pasa la prueba)
            pg.clock.install(time=when.replace(tzinfo=MADRID))
            pg.goto(app_url(path))
            pg.clock.run_for(800)
            pg.evaluate(rd('seed.js'))
            pg.clock.run_for(500)
            return c, pg

        c, pg = device(datetime.datetime(2026, 11, 12, 10, 0))
        ev = pg.evaluate
        run = lambda ms=300: pg.clock.run_for(ms)
        today = ev('dayKey(new Date())')

        print('Nutrición: sumas')
        food = lambda: {'n': 'Alimento %d' % rnd.randint(1, 999), 'g': rnd.choice([rnd.randint(1, 600), round(rnd.uniform(0.5, 300), 1)]),
                        'b': [rnd.randint(0, 900), round(rnd.uniform(0, 100), 1), round(rnd.uniform(0, 100), 1), round(rnd.uniform(0, 100), 1), 0, 0]}
        bad = []
        for n_meals in (2, 3, 4, 5, 6):
            for _ in range(6):
                day = {str(i): [food() for _ in range(rnd.randint(0, 5))] for i in range(n_meals)}
                ev("([d,m,n])=>{S.nutritionGoals.n=n;S.meals[d]=m;S.tab=1;saveState();R()}", [today, day, n_meals])
                want = total([it for l in day.values() for it in l])
                head = ev("document.querySelector('.cd.pos-sticky').innerText")
                kcal = int(head.split('\n')[-1].split(' / ')[0])
                grams = [int(x.split(' / ')[0]) for x in head.split('\n') if ' g' in x and ' / ' in x]
                cards = ev("[...document.querySelectorAll('#app .cd')].filter(c=>c.querySelector('.mlb')).map(c=>[...c.querySelectorAll('.mac b')].map(x=>parseInt(x.textContent)))")
                per = [[jsround(v) for v in total(day[str(i)])[1:]] for i in range(n_meals)]
                ev('S.tab=2;R()')
                dash = int(ev("[...document.querySelectorAll('#app .g2 .cd')].map(x=>x.innerText.split('\\n')[0])[3]"))
                if kcal != jsround(want[0]) or grams != [jsround(v) for v in want[1:]] or cards != per or dash != kcal:
                    bad.append([n_meals, kcal, jsround(want[0]), grams, cards[:2], per[:2], dash])
        check('el total del día (kcal, hidratos, proteínas y grasas) es la suma de sus alimentos, en 30 días al azar', not bad, str(bad[:2]))
        check('y el de cada comida, la de los suyos; y las kcal de hoy del Dashboard, las mismas', not bad)
        ev("([d])=>{S.nutritionGoals.n=5;S.meals[d]={0:[{n:'A',g:100,b:[100,10,10,2,0,0]}],4:[{n:'B',g:150,b:[300,30,20,10,0,0]}]};S.nutritionGoals.n=3;S.tab=1;saveState();R()}", [today])
        txt = ev("document.querySelector('#app').innerText")
        check('con menos comidas al día, lo anotado en las que ya no están se sigue viendo y contando', '550 / ' in txt and 'Comida 5' in txt and 'Fuera de tus comidas del día' in txt, txt[:300])
        ev('S.tab=2;R()')
        check('y el Dashboard dice lo mismo', ev("[...document.querySelectorAll('#app .g2 .cd')].map(x=>x.innerText.split('\\n')[0])[3]") == '550')
        ev("([d])=>{S.nutritionGoals.k=0;S.meals[d]={};S.tab=1;R()}", [today])
        check('sin objetivo ni comidas, la barra de kcal no se rompe', ev("document.querySelector('.cd.pos-sticky .bar.mt-8 i').style.width") == '0%')
        ev("S.nutritionGoals.k=1942;saveState()")

        print('Nutrición: lo que se escribe')
        grams = []
        for typed in ('-500', '0', '1e9', 'abc', '', '12,5', '250'):
            ev("A.openAddFood(0)")
            run()
            ev("A.pickFood(0)")
            run()
            ev("v=>{document.getElementById('gr').value=v}", typed) if typed not in ('abc', '12,5') else ev("v=>{const e=document.getElementById('gr');e.type='text';e.value=v}", typed)
            ev("A.addFood()")
            run()
            grams.append(ev("d=>S.meals[d][0].slice(-1)[0].g", today))
        check('al añadir un alimento, los gramos van de 0,1 a 5.000 (si no, 100) y admiten la coma', grams == [100, 100, 100, 100, 100, 12.5, 250], str(grams))
        ev("C.setItemGrams({value:'-3'},0,0)")
        check('y al cambiarlos después, tampoco pueden ser negativos', ev("d=>S.meals[d][0][0].g", today) == 0)
        ev("A.openAddFood(0)")
        run()
        ev("A.addTab(2)")
        run()
        ev("document.getElementById('n0').value='x'.repeat(300);[['k','-50'],['c','500'],['p','20,5'],['f','9'],['fi',''],['s','1e9']].forEach(([k,v])=>{const e=document.getElementById('n_'+k);e.type='text';e.value=v});A.newFoodSave()")
        run()
        mine = ev("S.myFoods.slice(-1)[0]")
        check('un alimento nuevo: valores por 100 g entre 0 y su máximo, con coma decimal, y un nombre de 80 letras como mucho', mine['b'] == [0, 0, 20.5, 9, 0, 0] and len(mine['n']) == 80, str(mine)[:120])
        ev("sheet()")

        print('Objetivos de kcal y macros')
        bad = []
        for _ in range(300):
            bio = {'sex': rnd.choice('MF'), 'age': str(rnd.randint(14, 99)), 'h': str(rnd.randint(120, 230)), 'w': str(round(rnd.uniform(30, 300), 1)), 'act': str(rnd.randint(0, 4))}
            dt = rnd.randint(0, 5)
            got = ev("([b,dt])=>{S.biometrics=b;S.nutritionGoals={k:1942,c:50,p:20,f:30,n:3,dt};applyDiet(1);return [S.nutritionGoals,tdee()]}", [bio, dt])
            g, t = got[0], got[1]
            bm = 10 * float(bio['w']) + 6.25 * float(bio['h']) - 5 * float(bio['age']) + (-161 if bio['sex'] == 'F' else 5)
            td = bm * [1.2, 1.375, 1.55, 1.725, 1.9][int(bio['act'])]
            ok = abs(t['bm'] - bm) < 1e-6 and abs(t['td'] - td) < 1e-6 and g['c'] + g['p'] + g['f'] == 100 and all(0 <= g[k] <= 100 for k in 'cpf') and g['c'] >= 10 and 800 <= g['k'] <= 8000 and g['k'] % 1 == 0
            if not ok:
                bad.append([bio, dt, g, t])
        check('el gasto es el de Mifflin-St Jeor por la actividad; kcal de 800 a 8.000 y porcentajes de 0 a 100 que suman 100 (300 perfiles al azar)', not bad, str(bad[:2]))
        ev("S.biometrics={sex:'M',age:'30',h:'178',w:'80',act:'2',goal:'1'};S.nutritionGoals={k:1942,c:50,p:20,f:30,n:3,dt:3};applyDiet(1)")
        g = ev('S.nutritionGoals')
        td = (10 * 80 + 6.25 * 178 - 5 * 30 + 5) * 1.55
        check('un caso a mano: hombre, 30 años, 178 cm, 80 kg, actividad moderada, mantenimiento', g['k'] == jsround(td) and g['p'] == jsround(1.8 * 80 * 400 / g['k']) and g['f'] == jsround(1 * 80 * 900 / g['k']), str(g))
        tg = ev("(()=>{const n=S.nutritionGoals;return [n.k*n.c/400,n.k*n.p/400,n.k*n.f/900]})()")
        check('los gramos del objetivo dan sus kcal (4, 4 y 9 kcal por gramo)', abs(tg[0] * 4 + tg[1] * 4 + tg[2] * 9 - g['k']) < 1e-6)
        ev("S.tab=3;R()")
        before = ev('JSON.stringify(S.biometrics)')
        for k, v in (('age', '500'), ('h', '-170'), ('w', '0'), ('w', 'abc')):
            ev("([k,v])=>C.bioField({dataset:{i:k},value:v})", [k, v])
        check('en Perfil, una edad, una altura o un peso imposibles no se guardan', ev('JSON.stringify(S.biometrics)') == before, ev('JSON.stringify(S.biometrics)'))
        ev("C.bioField({dataset:{i:'w'},value:'82,5'})")
        check('y uno posible, sí (también con coma)', ev('S.biometrics.w') == '82.5')
        ev("S.biometrics.w='-80';S.biometrics.act='9'")
        check('con datos biométricos dañados no se calculan objetivos', ev('tdee()') == 0)
        ev("S.biometrics.w='80';S.biometrics.act='2'")

        print('Peso corporal')
        ev("S.tab=2;R();A.openWeight()")
        run()
        n0 = ev('S.weightLog.length')
        for w, d in (('-80', today), ('5000', today), ('', today), ('81', '2030-01-01'), ('81', 'ayer')):
            ev("([w,d])=>{document.getElementById('wv').value=w;const e=document.getElementById('wd');e.type='text';e.value=d;A.weightAdd()}", [w, d])
        check('un peso imposible o una fecha que no ha llegado no se registran', ev('S.weightLog.length') == n0 and ev('S.biometrics.w') == '80', str(ev('S.weightLog.slice(-2)')))
        ev("([d])=>{document.getElementById('wv').value='81.4';document.getElementById('wd').value=d;A.weightAdd()}", [today])
        check('uno bueno, sí, y pasa a ser el peso del perfil', ev('S.weightLog.slice(-1)[0].w') == 81.4 and ev('+S.biometrics.w') == 81.4)
        ev("A.weightBack()")

        print('Entreno')
        ev("S.units='kg';S.tab=0;R();A.startWorkout()")
        run(800)
        ev("C.setReps({value:'-5'},0,0);C.setWeight({value:'-100'},0,0)")
        check('una serie no admite repeticiones ni peso negativos', ev('[W.sets[0][0].r,W.sets[0][0].w]') == [0, 0])
        for units in ('kg', 'lb'):
            if units == 'lb':
                ev("S.units='lb';S.tab=0;R();A.startWorkout()")
                run(800)
            sets = ev("W.sets.map(a=>a.length)")
            want, typed = 0.0, []
            for i, n in enumerate(sets):
                for j in range(n):
                    r, w, ok = rnd.randint(1, 20), rnd.choice([0, 2.5, 20, 42.5, 100, 137.5]), rnd.random() < 0.8
                    typed.append([i, j, r, w, ok])
            ev("(t)=>{t.forEach(([i,j,r,w,ok])=>{C.setReps({value:String(r)},i,j);C.setWeight({value:String(w)},i,j);W.sets[i][j].ok=ok?1:0})}", typed)
            kg = ev("W.sets.map(a=>a.map(s=>s.w))")
            done = 0
            for i, j, r, w, ok in typed:
                if ok:
                    done += 1
                    want += r * kg[i][j]
            ev("A.finishSave()")
            run(1000)
            log = ev('S.logs.slice(-1)[0]')
            check('el volumen guardado es la suma de repeticiones × peso (en kg) de las series hechas, escribiendo en %s' % units, abs(log['v'] - want) < 1e-6 and log['s'] == done, '%s %s %s' % (log, want, done))
            if units == 'lb':
                check('lo escrito en libras se guarda en kg', any(abs(kg[i][j] - round(w / 2.20462, 2)) < 1e-9 for i, j, r, w, ok in typed if w), str(kg[:1]))
            ev("document.querySelector('#upd')&&document.querySelector('#upd').remove();sheet();document.querySelector('#dg').innerHTML=''")
        best = ev("(()=>{const out=[];for(const n of Object.keys(S.exerciseHistory)){let b=((S.records||{})[n]||{}).e||0;S.exerciseHistory[n].forEach(x=>x.s.forEach(q=>{if(+q[1]>0)b=Math.max(b,q[1]*(1+q[0]/30))}));const r=bestOf(n);if(b>0)out.push([n,b,r&&r.e])}return out})()")
        check('el récord de cada ejercicio es su mejor 1RM estimado (Epley: peso × (1 + repeticiones / 30)), entre el guardado y su historial', len(best) > 3 and all(abs(x[1] - x[2]) < 1e-6 for x in best), str([x for x in best if abs(x[1] - (x[2] or 0)) > 1e-6][:2]))
        ev("S.units='kg';S.logs=[{d:'2026-11-12',n:'A',v:1,s:1,m:1,q:7},{d:'2026-11-06',n:'B',v:1,s:1,m:1,q:7},{d:'2026-11-05',n:'C',v:1,s:1,m:1,q:7},{d:'2026-11-13',n:'D',v:1,s:1,m:1,q:7}];S.tab=2;R()")
        check('«Últimos 7 días» cuenta hoy y los seis días de antes', ev("[...document.querySelectorAll('#app .g2 .cd')].map(x=>x.innerText.split('\\n')[0])[1]") == '2')
        c.close()

        print('Fechas')
        for when, prev, nxt in ((datetime.datetime(2026, 3, 30, 0, 30), '29 mar', '31 mar'), (datetime.datetime(2026, 10, 26, 0, 30), '25 oct', '27 oct'),
                                (datetime.datetime(2026, 3, 29, 23, 30), '28 mar', '30 mar'), (datetime.datetime(2027, 1, 1, 0, 10), '31 dic', '2 ene')):
            c, pg = device(when)
            ev = pg.evaluate
            ev('S.tab=1;R();A.nutritionDay(-1)')
            a = ev("document.querySelector('.hd h1').textContent")
            ev('A.nutritionDay(2)')
            z = ev("document.querySelector('.hd h1').textContent")
            ev('A.nutritionDay(-1);A.addWater(1)')
            w = ev("Object.keys(S.water).includes(dayKey(new Date()))")
            check('el %s a las %s: ayer es el %s y mañana el %s, y lo de hoy se anota en hoy' % (when.strftime('%d/%m/%Y'), when.strftime('%H:%M'), prev, nxt), a == prev and z == nxt and w, '%s %s %s' % (a, z, w))
            c.close()
        check('sin errores de JS', not errs, str(errs[:3]))
        b.close()
    print()
    if fails:
        print('FALLAN: ' + '; '.join(fails))
        sys.exit(1)
    print('TODO CORRECTO')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'dist', 'stratafit.html'))
