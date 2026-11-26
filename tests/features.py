"""Prueba de funciones de Nutrición, Perfil y Ajustes: tipo de día automático, ayudas «?», botones de cada comida,
«Mi nutrición» (objetivos a mano que no se pisan), alimentos por grupos, Perfil y Ajustes, medallas de Logros e
«Informar de un fallo» (fallo o sugerencia, que sin conexión espera a la red).

  python3 tests/features.py dist/stratafit.html
Requiere:  pip install playwright  &&  playwright install chromium   (otro motor: SF_BROWSER=webkit; ver tests/browser.py)
"""
import os, re, sys, json, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


fails = []
MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def legal_meta(kind):
    """La línea de la fecha y la versión de un texto legal, tal como la tiene que enseñar su pantalla: las dos salen de
    cloud/consent (LEGAL), que es donde se cambian al publicar."""
    src = open(os.path.join(HERE, '..', 'src', 'js', 'cloud', 'consent.js'), encoding='utf-8').read()
    m = re.search(kind + r": \{ v: '([\d.]+)', date: '(\d{4})-(\d{2})-(\d{2})'", src)
    return 'Última actualización: %d de %s de %s · Versión %s' % (int(m.group(4)), MONTHS[int(m.group(3)) - 1], m.group(2), m.group(1))


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def main(path):
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
        c.add_init_script(rd('init.js'))
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('dialog', lambda d: d.accept())
        # jueves 29 de octubre de 2026: Día 4 de la rutina (el Día 1 es el lunes)
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        pg.goto(app_url(path))
        pg.clock.run_for(800)
        pg.evaluate(rd('seed.js'))
        pg.evaluate(rd('extra.js'))

        def reload():
            pg.reload()
            pg.wait_for_load_state('load')
            pg.clock.run_for(800)

        reload()
        ev = pg.evaluate
        run = lambda ms=300: pg.clock.run_for(ms)

        print('Tipo de día (entreno o descanso) según la rutina')
        plan = ev("S.plan.map(d=>d.ex.length>0)")
        check('el plan de prueba tiene días de entreno y de descanso', any(plan) and not all(plan), str(plan))
        # fechas de la semana del 26 de octubre (lunes) al 1 de noviembre
        days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']
        tr = [i for i in range(7) if plan[i]]
        rs = [i for i in range(7) if not plan[i]]
        fut = [i for i in range(3, 7)]
        ev("window.__logs=S.logs.slice();S.logs=S.logs.filter(l=>l.d<'2026-10-26'||l.d>'2026-11-01')")
        got = ev("%s.map(k=>dayInfo(k).t)" % json.dumps(days))
        check('hoy y los días que vienen siguen la rutina (Día 1 = lunes)', all(got[i] == ('t' if plan[i] else 'r') for i in fut), str(got))
        past_tr = [i for i in tr if i < 3]
        check('un día de entreno ya pasado sin entreno registrado cuenta como descanso', past_tr and all(got[i] == 'r' for i in past_tr), str(got))
        if past_tr:
            d = days[past_tr[0]]
            ev("S.logs.push({d:%s,n:'Prueba',ex:[],s:1,v:0,m:30})" % json.dumps(d))
            check('con un entreno registrado vuelve a ser día de entreno', ev("dayInfo(%s).t" % json.dumps(d)) == 't')
        past_rs = [i for i in rs if i < 3]
        if past_rs:
            d = days[past_rs[0]]
            ev("S.logs.push({d:%s,n:'Prueba',ex:[],s:1,v:0,m:30})" % json.dumps(d))
            check('entrenar un día de descanso lo convierte en día de entreno', ev("dayInfo(%s).t" % json.dumps(d)) == 't')
        ev("S.logs=window.__logs")
        ev("S.tab=1;R()")
        run()
        check('Nutrición ya no tiene el selector Entreno / Descanso', ev("!document.querySelector('[data-a=dty]')"))
        check('Nutrición dice qué tipo de día es hoy', ev("document.querySelector('.day-type').innerText") == ('Día de entreno' if plan[3] else 'Día de descanso'), ev("document.querySelector('.day-type').innerText"))

        print('Ayudas «?» de las plantillas')
        ev("document.querySelectorAll('details').forEach(d=>d.open=true)")
        n = ev("document.querySelectorAll('[data-a=helpTip]').length")
        check('«Aplicar» y «Guardar como plantilla» tienen su «?»', n == 2, str(n))
        ev("document.querySelector('[data-a=helpTip][data-v=tpa]').click()")
        run(100)
        t = ev("(document.getElementById('tip')||{}).textContent||''")
        check('el «?» explica para qué sirve', 'plantilla' in t and len(t) > 40, t)
        ev("document.querySelector('[data-a=helpTip][data-v=tpa]').click()")
        check('tocar otra vez el «?» la cierra', ev("!document.getElementById('tip')"))
        ev("document.querySelector('[data-a=helpTip][data-v=tps]').click()")
        ev("document.querySelector('.page-head h1').click()")
        check('tocar fuera la cierra', ev("!document.getElementById('tip')"))

        print('Botones de cada comida')
        nm = ev("S.nutritionGoals.n")
        for a in ('openAddFood', 'saveDishAsk', 'openFoodSearch', 'openMealScanner'):
            k = ev("document.querySelectorAll('.meal-actions [data-a=%s]').length" % a)
            check('cada comida tiene su botón «%s»' % a, k == nm, '%s de %s' % (k, nm))
        ev("A.openFoodSearch(1)")
        run()
        check('«Buscar» abre la búsqueda en internet para esa comida', ev("!!document.getElementById('f2q')&&addState.m==1"))
        ev("A.closeSheet()")
        ev("A.openMealScanner(2)")
        pg.wait_for_timeout(300)
        run()
        check('«Scan» abre el escáner para esa comida', ev("!!document.getElementById('f2ean')&&addState.m==2"))
        ev("A.scannerClose()")
        run()
        check('cerrar el escáner vuelve a Nutrición', ev("!document.getElementById('f2ean')&&!document.querySelector('#sh .sheet')"))

        print('Mi nutrición: objetivos del plan y a mano')
        ev("Object.assign(S.biometrics,{w:'80',h:'180',age:'30',sex:'M',act:1});S.nutritionGoals.dt=3;delete S.nutritionGoals.man")
        ev("A.openMyNutrition()")
        run()
        ev("A.goalsRecalculate()")
        run()
        k_plan = ev("S.nutritionGoals.k")
        check('«Recalcular con mis datos» calcula las kcal con el gasto diario', abs(k_plan - ev("Math.round(tdee().td)")) <= 1, '%s / %s' % (k_plan, ev("tdee().td")))
        check('la página dice «Según tu plan»', 'Según tu plan' in ev("document.querySelector('.goals-mode').innerText"))
        check('el anillo tiene un arco por macro', ev("document.querySelectorAll('.goals-ring circle').length") == 3)
        ev("A.openManualGoals()")
        run()
        ev("document.getElementById('mnk').value='2500';document.getElementById('mnc0').value='40';document.getElementById('mnp0').value='30';document.getElementById('mnf0').value='20';U.manualGoalsPreview()")
        check('la vista previa avisa si los porcentajes no suman 100', 'suman 90' in ev("document.getElementById('mnv').textContent"))
        ev("A.manualGoalsSave()")
        run()
        check('con porcentajes que no suman 100 no se guarda', ev("S.nutritionGoals.k") == k_plan and not ev("S.nutritionGoals.man"))
        ev("A.openManualGoals()")
        run()
        ev("document.getElementById('mnk').value='2500';document.getElementById('mnc0').value='40';document.getElementById('mnp0').value='30';document.getElementById('mnf0').value='30';A.manualGoalsSave()")
        run()
        check('«Ajustar a mano» guarda kcal y macros', ev("[S.nutritionGoals.k,S.nutritionGoals.c,S.nutritionGoals.p,S.nutritionGoals.f,S.nutritionGoals.man]") == [2500, 40, 30, 30, 1], str(ev("S.nutritionGoals")))
        check('la página dice «A mano»', 'A mano' in ev("document.querySelector('.goals-mode').innerText"))
        ev("const e=document.querySelector('[data-c=goalsWeight]');e.value='85';e.dispatchEvent(new Event('change',{bubbles:true}))")
        run()
        check('cambiar el peso no pisa lo puesto a mano', ev("S.biometrics.w") == '85' and ev("S.nutritionGoals.k") == 2500)
        ev("const e=document.querySelector('[data-c=goalsActivity]');e.value='3';e.dispatchEvent(new Event('change',{bubbles:true}))")
        run()
        check('cambiar la actividad tampoco', ev("S.biometrics.act") == 3 and ev("S.nutritionGoals.k") == 2500)
        ev("const e=document.querySelector('[data-c=goalsDiet]');e.value='2';e.dispatchEvent(new Event('change',{bubbles:true}))")
        run()
        check('elegir otro objetivo vuelve al plan y recalcula', ev("S.nutritionGoals.dt") == 2 and not ev("S.nutritionGoals.man") and ev("S.nutritionGoals.k") != 2500, str(ev("S.nutritionGoals")))
        ev("const e=document.querySelector('[data-c=goalsMeals]');e.value='3';e.dispatchEvent(new Event('change',{bubbles:true}))")
        run()
        check('comidas al día', ev("S.nutritionGoals.n") == 5)
        ev("A.closeSheet()")
        ev("S.nutritionGoals={k:'<img src=x>',c:-5,p:'x',f:200,n:99,dt:'zz',man:0};S.dt={'2026-10-29':'r'};saveState()")
        reload()
        check('al arrancar, unos objetivos dañados quedan válidos', ev("[S.nutritionGoals.k,S.nutritionGoals.c,S.nutritionGoals.p,S.nutritionGoals.f,S.nutritionGoals.n,'dt' in S.nutritionGoals]") == [1942, 50, 20, 30, 3, False], str(ev("S.nutritionGoals")))
        check('y el tipo de día elegido a mano (1.23) se borra', ev("!('dt' in S)"))

        print('Alimentos por grupos')
        nf = ev("FOODS_SRC.length")
        check('hay al menos 490 alimentos', nf >= 490, str(nf))
        bad = ev("""FOODS_SRC.filter(f=>typeof f.n!='string'||!f.n||f.b.length!=6||f.b.some(v=>!(v>=0))||!(f.g>=0&&f.g<FOOD_GROUPS.length)).map(f=>f.n)""")
        check('todos con nombre, 6 valores válidos y grupo', not bad, str(bad[:5]))
        dup = ev("""(()=>{const s=new Set(),d=[];FOODS_SRC.forEach(f=>{const k=f.n.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');if(s.has(k))d.push(f.n);s.add(k)});return d})()""")
        check('sin nombres repetidos', not dup, str(dup[:5]))
        ev("S.tab=1;R();A.openAddFood(0)")
        run()
        ng = ev("document.querySelectorAll('.food-groups button').length")
        check('la hoja «Añadir» tiene un botón por grupo y «Todos»', ng >= ev("FOOD_GROUPS.length") + 1, str(ng))
        n_all = ev("document.querySelectorAll('#rs [data-a=pickFood]').length")
        check('sin buscar se ven todos los alimentos (antes, solo 30)', n_all >= 490, str(n_all))
        ev("A.foodGroup(1)")
        run(100)
        g1 = ev("[...document.querySelectorAll('#rs [data-a=pickFood]')].map(e=>FOODS_SRC[+e.dataset.i]&&FOODS_SRC[+e.dataset.i].g)")
        check('un grupo muestra solo sus alimentos', g1 and all(g == 1 for g in g1), str(g1[:5]))
        ev("const i=document.querySelector('[data-u=foodSearch]');i.value='zzzz no existe';i.dispatchEvent(new Event('input',{bubbles:true}))")
        run(100)
        check('sin resultados ofrece buscarlo en internet', ev("!!document.querySelector('#rs [data-a=searchListOnline]')"))
        ev("A.closeSheet()")

        print('Perfil y Ajustes')
        ev("S.tab=3;R()")
        run()
        sums = ev("[...document.querySelectorAll('#app summary.profile-summary b')].map(b=>b.innerText)")
        check('Plan y Datos biométricos son desplegables con icono', sums == ['Plan de entrenamiento', 'Datos biométricos'], str(sums))
        check('sin datos personales: ni nombre, ni email, ni teléfono (solo el usuario)', ev("!document.querySelector('[data-c=pf]') && document.querySelector('.profile-head .profile-name').textContent") == 'Prueba')
        check('«Medidas», sin fotos de progreso', ev("!!document.querySelector('#app [data-a=openMeasures]') && document.querySelector('#app [data-a=openMeasures]').innerText.split('\\n')[0]") == 'Medidas')
        check('«Ajustes» es una fila con icono, no un desplegable', ev("!!document.querySelector('#app button.link-card[data-a=openSettings] svg')"))
        brand = ev("document.querySelector('.brand').innerText.replace(/\\s+/g,' ')")
        check('el pie dice STRATAFIT y la versión', brand == 'STRATAFIT V' + ev("APPV"), brand)
        check('fuera del pie, sin el copyright ni el aviso (van en Ajustes, Aviso legal)', ev("!document.querySelector('#app .ver')"))
        ev("S.profile.name='Ana';S.profile.email='a@b.c';S.profile.tel='600';saveState()")
        reload()
        check('al abrir, los datos personales que hubiera se borran (F-35)', ev("['name','email','tel'].every(k=>!(k in S.profile))"))
        ev("S.tab=3;R()")
        run()
        ev("A.openSettings()")
        run()
        rows = ev("[...document.querySelectorAll('#ajs .setting-row')].map(b=>b.dataset.a+(b.dataset.v?':'+b.dataset.v:''))")
        want = ['openSettingsPage:cuenta', 'accountSyncNow', 'openSettingsPage:tema', 'openSettingsPage:acento', 'openSettingsPage:inicio', 'openSettingsPage:idioma', 'openSettingsPage:unidades', 'openSettingsPage:sonido', 'openBackup', 'resetAllAsk', 'updateCheck', 'openSettingsPage:nota', 'tourReplay', 'openDiagnostics', 'openReport', 'openSettingsPage:avanzado', 'openLegal:privacy', 'openLegal:terms', 'signOut']
        check('Ajustes tiene todas sus filas', rows == want, str(rows))
        check('con secciones', ev("[...document.querySelectorAll('#ajs .section-label')].map(e=>e.innerText.trim().toLowerCase())") == ['cuenta', 'apariencia', 'entreno', 'datos', 'app', 'ajustes avanzados', 'información'])
        check('«Cerrar sesión», en rojo y con su icono, al final', ev("(()=>{const b=document.querySelector('#ajs .setting-signout [data-a=signOut]');return !!b&&!!b.querySelector('.setting-label.red')&&!!b.querySelector('.setting-icon.red svg')})()"))
        ev("A.openSettingsPage(0,{dataset:{v:'tema'}})")
        run()
        ev("document.querySelector('#sh [data-a=themeChoose][data-v=light]').click()")
        run()
        check('cambiar el tema se ve al momento en la página', ev("document.querySelector('#sh [data-a=themeChoose][data-v=light]').classList.contains('on')") and ev("S.theme") == 'light')
        ev("document.querySelector('#sh [data-a=openSettings]').click()")
        run()
        check('«←» vuelve a Ajustes', ev("!!document.querySelector('#ajs .setting-row[data-a=resetAllAsk]')"))
        ev("A.openBackup()")
        run()
        check('la copia de seguridad abierta desde Ajustes tiene «←» a Ajustes', ev("!!document.querySelector('#sh [data-a=openSettings]')"))
        ev("A.openSettings();A.openLegal(0,{dataset:{v:'terms'}})")
        run()
        check('el aviso legal lleva el copyright y el aviso de salud', all(s in ev("document.querySelector('#sh').innerText") for s in ('Rodriguez Mazuelas', 'no sustituyen la supervisión técnica de un profesional', 'se recomienda consultar a un profesional cualificado')), repr(ev("document.querySelector('#sh').innerText")[:300]))
        check('y dice que el uso gratuito es durante la fase de pruebas, con riesgo de perder datos (I-29)', all(s in ev("document.querySelector('#sh').innerText") for s in ('Durante la fase de pruebas, el servicio se ofrece gratuitamente para uso personal y no comercial', 'pérdidas totales o parciales de información')))
        legal = ev("({ h1: document.querySelector('#lgl h1').textContent, meta: document.querySelector('#lgl .legal-meta').textContent, sections: [...document.querySelectorAll('#lgl section h2')].map(h => h.textContent), index: document.querySelectorAll('#lgl .legal-index li button').length, back: document.querySelector('#lgl [aria-label=Volver]').dataset.a })")
        check('con su título, la fecha y la versión, y sus 16 apartados, cada uno en el índice',
              legal['h1'] == 'Aviso legal y condiciones de uso' and legal['meta'] == legal_meta('terms') and len(legal['sections']) == 16 == legal['index']
              and legal['sections'][0] == '1. Identificación del titular' and legal['sections'][15].startswith('16. '), str(legal))
        ev("document.querySelector('#lgl .legal-index [data-a=legalJump][data-i=\"8\"]').click()")
        run()
        jump = ev("(s => { const r = s.getBoundingClientRect(), p = document.querySelector('#sh .sheet').getBoundingClientRect(); return [Math.round(r.top - p.top), document.activeElement === s.querySelector('h2'), s.querySelector('h2').textContent]; })(document.querySelector('#lgs8'))")
        check('el índice lleva a su apartado, arriba de la página y con el foco en su título', abs(jump[0]) < 40 and jump[1] and jump[2] == '9. Datos nutricionales y Open Food Facts', str(jump))
        off = ev("[...document.querySelectorAll('#lgs8 a.legal-link')].map(a => [a.textContent, a.href, a.target, a.rel])")
        check('los enlaces a otras webs se abren aparte y sin dar acceso a esta página', [x[1] for x in off] == ['https://world.openfoodfacts.org/', 'https://opendatacommons.org/licenses/odbl/1-0/', 'https://world.openfoodfacts.org/terms-of-use']
              and all(x[2] == '_blank' and x[3] == 'noopener noreferrer' and x[0] for x in off), str(off))
        ev("document.querySelector('#lgs12 [data-a=openLegal]').click()")
        run()
        priv = ev("({ h1: (document.querySelector('#lgl h1') || {}).textContent, cards: document.querySelectorAll('#lgl .legal-card').length, sections: document.querySelectorAll('#lgl section').length, data: [...document.querySelectorAll('#lgl .link-card')].map(b => b.dataset.a).join(), status: document.querySelectorAll('#lgl .legal-status div').length, back: document.querySelector('#lgl [aria-label=Volver]').dataset.a, top: document.querySelector('#sh .sheet').scrollTop })")
        check('del aviso legal se pasa a la Política de privacidad: su resumen en seis tarjetas, «Tus datos» y sus 20 apartados',
              priv['h1'] == 'Política de privacidad de StrataFit' and priv['cards'] == 6 and priv['sections'] == 20 and priv['status'] == 2 and priv['top'] == 0
              and priv['data'] == 'legalBackup,openPrivacyContact,consentWithdrawAsk,resetAllAsk,openDeleteAccount', str(priv))
        check('y «←» vuelve a Ajustes desde las dos', legal['back'] == 'openSettings' == priv['back'])
        # en «Tus datos», el consentimiento dado se puede leer entero
        ev("document.querySelector('#lgl .legal-status [data-a=openLegal][data-v=consent]').click()")
        run()
        cons = ev("({ h1: (document.querySelector('#lgl h1') || {}).textContent, sections: document.querySelectorAll('#lgl section').length, back: document.querySelector('#lgl [aria-label=Volver]').dataset.a, meta: document.querySelector('#lgl .legal-meta').textContent })")
        check('«Leer el consentimiento» abre su texto entero, con su fecha y su versión, y «←» vuelve a Ajustes',
              cons['h1'] == 'Consentimiento informado para el tratamiento de datos de salud' and cons['sections'] == 9 and cons['back'] == 'openSettings' and cons['meta'] == legal_meta('health'), str(cons))
        ev("A.openSettings();A.openLegal(0,{dataset:{v:'privacy'}})")
        run()
        ev("document.querySelector('#lgl [data-a=legalBackup]').click()")
        run()
        check('«Exportar una copia» abre la copia de seguridad, con «←» a Ajustes', ev("!!document.querySelector('#sh [data-a=backupDownload]') && !!document.querySelector('#sh [aria-label=Volver][data-a=openSettings]')"))
        ev("A.openSettings();A.openLegal(0,{dataset:{v:'privacy'}})")
        run()
        ev("document.querySelector('#lgl [data-a=openPrivacyContact]').click()")
        run()
        contact = ev("({ kind: [...document.querySelectorAll('#rpp [data-a=reportChooseKind]')].map(b => b.dataset.v + (b.classList.contains('on') ? '*' : '')).join(), tech: document.getElementById('rpd').checked, label: document.querySelector('#rpp label[for=rpx]').textContent })")
        check('«Contactar sobre privacidad» abre el aviso ya con el tipo «Privacidad y datos», sin datos técnicos marcados', contact == {'kind': 'f,s,p*', 'tech': False, 'label': 'Tu consulta'}, str(contact))
        check('y el aviso vuelve a Ajustes', ev("document.querySelector('#rpp [aria-label=Volver]').dataset.a") == 'openSettings')
        ev("A.openSettings();A.openLegal(0,{dataset:{v:'privacy'}})")
        run()
        ev("document.querySelector('#lgl [data-a=openDeleteAccount]').click()")
        run()
        check('«Eliminar cuenta» pide la contraseña y vuelve a Privacidad', ev("!!document.querySelector('#dlc #dlp') && document.querySelector('#dlc [aria-label=Volver]').dataset.a") == 'openLegal')
        ev("document.querySelector('#dlc [data-a=deleteAccountAsk]').click()")
        run()
        check('sin contraseña no pregunta nada: la pide', ev("document.getElementById('dle').textContent") == 'Escribe tu contraseña.' and ev("!document.querySelector('#dg').firstChild"))
        ev("document.querySelector('#dlc [aria-label=Volver]').click()")
        run()
        check('y al volver, Privacidad sigue llevando a Ajustes', ev("(document.querySelector('#lgl h1') || {}).textContent") == 'Política de privacidad de StrataFit' and ev("document.querySelector('#lgl [aria-label=Volver]').dataset.a") == 'openSettings')
        ev("document.querySelector('#lgl [data-a=consentWithdrawAsk]').click()")
        run()
        check('«Retirar el consentimiento» dice antes qué se borra y qué se queda', all(s in ev("document.querySelector('#dg').innerText") for s in ('dejará de tratar tus datos de salud', 'Tu usuario se mantiene', 'No se puede deshacer')) and ev("!!document.querySelector('#dg [data-v=consentWithdraw]')"))
        ev("document.querySelector('#dg [data-v=doNothing]').click()")
        ev("A.closeSheet()")

        print('Medallas de Logros')
        ids = ev("ACHIEVEMENTS.map(x=>x[0])")
        svgs = ev("ACHIEVEMENTS.map(x=>medalSvg(x[0],58,1).replace(/md\\d+/g,''))")
        check('una medalla para cada logro', len(svgs) == len(ids) == 25, str(len(svgs)))
        check('todas distintas', len(set(svgs)) == len(svgs))
        ev("A.openAchievements()")
        run()
        n = ev("document.querySelectorAll('#sh .achievement svg.medal').length")
        check('la página de Logros pinta las 25 (sin las de fotos de progreso)', n == 25, str(n))
        on = ev("document.querySelectorAll('#sh .achievement.on svg.medal:not(.off)').length")
        off = ev("document.querySelectorAll('#sh .achievement:not(.on) svg.medal.off').length")
        check('las conseguidas en color y las que faltan en gris', on + off == 25, '%s + %s' % (on, off))
        check('y una vitrina con las conseguidas', ev("document.querySelectorAll('#sh .medal-row svg').length") == on)
        ev("A.closeSheet()")

        print('Informar de un fallo')
        ev("A.openSettings();A.openReport()")
        run()
        check('tres tipos: fallo, sugerencia de mejora o privacidad y datos', ev("[...document.querySelectorAll('.report-kinds button')].map(b=>b.innerText)") == ['Fallo', 'Sugerencia de mejora', 'Privacidad y datos'])
        ev("A.reportSend()")
        run(200)
        check('sin tipo no se envía (y lo dice)', not ev("(S.reports||[]).length") and 'Elige el tipo de aviso' in ev("document.getElementById('tt').innerText"))
        ev("document.querySelector('[data-a=reportChooseKind][data-v=f]').click()")
        run()
        check('un fallo deja elegir dónde (8 sitios)', ev("document.querySelectorAll('.report-areas button').length") == 8)
        ev("A.reportChooseArea(1)")
        check('elegir un sitio lo marca', ev("document.querySelector('.report-areas [data-i=\"1\"]').getAttribute('aria-checked')") == 'true')
        ev("document.getElementById('rpx').value='corto'")
        ev("A.reportSend()")
        run(200)
        check('con un texto muy corto no se envía (y lo dice)', not ev("(S.reports||[]).length") and 'al menos 10' in ev("document.getElementById('tt').innerText"))
        txt = 'Al guardar el entreno se perdió la serie 3 <img src=x onerror="window.__x=1">'
        ev("document.getElementById('rpx').value=%s;document.getElementById('rpd').checked=false" % json.dumps(txt))
        ev("A.reportSend()")
        run(600)
        it = ev("S.reports&&S.reports[0]") or {}
        check('sin conexión, el aviso se guarda para enviarlo al volver la red (y lo dice)', it.get('t') == txt and it.get('s') == 0 and it.get('k') == 'f' and it.get('a') == 'Se han perdido datos' and 'Sin conexión' in ev("document.getElementById('tt').innerText"), str(it))
        check('con su id: el de la cuenta y el momento', it.get('id', '').startswith('prueba-'))
        check('sin datos técnicos si se desmarca la casilla', 'dx' not in it)
        check('después enseña la lista, con el aviso «Sin enviar»', 'Sin enviar' in ev("document.querySelector('#rpl').innerText") and txt in ev("document.querySelector('#rpl').innerText"))
        check('el texto no se ejecuta en ningún momento', not ev("window.__x") and not ev("!!document.querySelector('#rpl img')"))
        ev("A.openReport();document.querySelector('[data-a=reportChooseKind][data-v=s]').click()")
        run()
        check('una sugerencia no pide el sitio y no adjunta datos técnicos por defecto', not ev("!!document.querySelector('.report-areas')") and not ev("document.getElementById('rpd').checked"))
        ev("document.getElementById('rpx').value='Poder exportar el análisis también en Excel';document.getElementById('rpd').checked=true;A.reportSend()")
        run(600)
        check('con la casilla marcada, lleva los datos técnicos', 'Navegador' in (ev("S.reports[0].dx") or '') and ev("S.reports.length") == 2)
        ev("A.closeSheet();S.tab=3;R()")
        run()
        check('Perfil dice que hay avisos sin enviar', 'sin enviar' in ev("document.querySelector('[data-a=openMyReports]').innerText"))

        print('Equipamiento al final del Overview (V1.0.4)')
        # un día con un ejercicio de cada tipo: con barra, con mancuernas, sin material y uno del usuario (que no dice el suyo)
        day = lambda ex: ev("sheet();S.tab=0;R();S.plan[S.selectedDay].ex=%s.map(n=>({n,s:3,rg:[8,12]}));A.openOverview()" % json.dumps(ex))
        icons = lambda sel: ev("[...document.querySelectorAll(%s)].map(i=>[i.getAttribute('alt'),i.complete&&i.naturalWidth==192&&i.naturalHeight==120])" % json.dumps(sel))
        day(['Press banca', 'Plancha', 'Remo mancuerna', 'Mi ejercicio de casa'])
        run()
        check('el Overview acaba con «Equipamiento (4)», después de los ejercicios', ev("(()=>{const s=document.querySelector('#app .equip-sum'),r=[...document.querySelectorAll('#app .exercise-row')].pop();return !!s&&!!r&&!!(r.compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING)&&s.querySelector('.equip-head b').innerText})()") == 'Equipamiento (4)')
        check('con el material sin repetir y por orden (sin «Peso corporal», que no hace falta decir)', ev("document.querySelector('#app .equip-open').getAttribute('aria-label')") == 'Equipamiento (4): Barra, Soporte press banca, Mancuerna y Banco', ev("document.querySelector('#app .equip-open').getAttribute('aria-label')"))
        got = icons('#app .equip-icons img')
        check('y sus cuatro iconos, cargados y sin texto propio (lo dice la etiqueta del botón)', len(got) == 4 and all(x == ['', True] for x in got), str(got))
        ev("A.overviewEdit()")
        run()
        check('al editar el día no sale', not ev("!!document.querySelector('#app .equip-sum')") and ev("!!document.querySelector('#app [data-a=openPicker]')"))
        ev("A.overviewEdit()")
        run()
        ev("document.querySelector('#app .equip-open').click()")
        run(600)
        check('al tocarlo se abre su página: «Equipamiento» y «Material necesario para esta sesión»', ev("document.querySelector('#sh .page-title').innerText") == 'Equipamiento' and ev("document.querySelector('#sh .equip-lead').innerText") == 'Material necesario para esta sesión')
        check('con una tarjeta por material: su icono y su nombre', ev("[...document.querySelectorAll('#sh .equip-card')].map(c=>c.innerText.trim())") == ['Barra', 'Soporte press banca', 'Mancuerna', 'Banco'] and all(x == ['', True] for x in icons('#sh .equip-card img')))
        ev("document.querySelector('#sh [data-a=closeSheet]').click()")
        run(600)
        check('la «←» vuelve al Overview', not ev("!!document.querySelector('#sh .equip-card')") and ev("!!document.querySelector('#app .equip-sum')"))
        day(['Plancha', 'Crunch'])
        run()
        check('un día sin material dice «Peso corporal»', ev("document.querySelector('#app .equip-open').getAttribute('aria-label')") == 'Equipamiento (1): Peso corporal')
        day(['Mi ejercicio de casa'])
        run()
        check('un día con solo ejercicios del usuario no lo enseña (no se sabe su material)', not ev("!!document.querySelector('#app .equip-sum')") and ev("!!document.querySelector('#app .exercise-row')"))
        day([])
        run()
        check('ni un día sin ejercicios', not ev("!!document.querySelector('#app .equip-sum')"))
        ev("A.overviewBack()")
        run()

        print('Librería: los grupos en tarjetas, con el diseño aprobado (V1.0.4)')
        ORDER = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazos', 'Abdomen', 'Cuádriceps', 'Isquios y glúteos', 'Gemelos', 'CrossFit', 'Hyrox', 'Funcional', 'Cardio']
        ev("sheet();S.tab=0;R();A.openLibrary()")
        run(600)
        cards = ev("""[...document.querySelectorAll('#sh .cat-grid .cat-card')].map(c => ({ g: c.dataset.v, name: c.querySelector('.cat-name').textContent,
            count: c.querySelector('.cat-count').textContent, label: c.getAttribute('aria-label'), wide: c.classList.contains('cat-wide'),
            art: (i => i ? [i.getAttribute('alt'), i.complete && i.naturalWidth > 0] : null)(c.querySelector('.cat-art img')),
            ico: (i => i ? [i.getAttribute('alt'), i.complete && i.naturalWidth > 0] : null)(c.querySelector('img.cat-ico')) }))""")
        real = ev("%s.map(g => exAll().filter(e => groupOf(e) == g).length)" % json.dumps(ORDER + ['Propio']))
        check('las 14 tarjetas, en el orden aprobado, y al final «Mis ejercicios» (con uno del usuario)', [c['g'] for c in cards] == ORDER + ['Propio'], str([c['g'] for c in cards]))
        check('cada una con su número de la librería (no el de las referencias); «1 ejercicio», en singular', [c['count'] for c in cards] == ['%d ejercicio%s' % (n, '' if n == 1 else 's') for n in real] and real[-1] == 1, str([c['count'] for c in cards]))
        check('su nombre y una etiqueta con el grupo y su número', all(c['name'] == (g if g != 'Propio' else 'Mis ejercicios') and c['label'] == '%s: %s' % (c['name'], c['count']) for c, g in zip(cards, ORDER + ['Propio'])), str([c['label'] for c in cards[:3]]))
        check('ilustración e icono cargados y decorativos (sin texto: lo dice la etiqueta); «Mis ejercicios», sin ilustración', all(c['art'] == ['', True] and c['ico'] == ['', True] for c in cards[:14]) and cards[14]['art'] is None, str([c['art'] for c in cards if c['art'] != ['', True]]))
        check('Funcional y Cardio son las anchas', [c['g'] for c in cards if c['wide']] == ['Funcional', 'Cardio'])
        legend = ev("[...document.querySelectorAll('#sh .cat-legend .cat-key')].map(k => [k.textContent.trim(), getComputedStyle(k.querySelector('.cat-dot')).backgroundColor])")
        check('debajo, la leyenda: rojo, el músculo principal; naranja, el secundario', legend == [['Músculo principal (mayor trabajo)', 'rgb(245, 29, 36)'], ['Músculo secundario (asistencia)', 'rgb(250, 134, 23)']], str(legend))
        # a cada ancho: sus columnas, y ningún nombre ni número se parte por dentro de una palabra o se sale de su tarjeta
        FIT = """(() => { const g = document.querySelector('#sh .cat-grid'), sh = document.querySelector('#sh .sheet');
          const split = t => { const n = t.firstChild; let at = 0; return t.textContent.split(' ').some(w => { const s = t.textContent.indexOf(w, at); at = s + w.length;
            const r = document.createRange(); r.setStart(n, s); r.setEnd(n, s + w.length); return r.getClientRects().length > 1; }); };
          const bad = [...g.querySelectorAll('.cat-card')].flatMap(c => [...c.querySelectorAll('.cat-name,.cat-count')].filter(t => split(t) || t.getBoundingClientRect().right > c.getBoundingClientRect().right - 1).map(t => t.textContent));
          return [getComputedStyle(g).gridTemplateColumns.split(' ').length, bad, sh.scrollWidth > sh.clientWidth]; })()"""
        for w, cols in ((320, 2), (390, 2), (768, 6)):
            pg.set_viewport_size({'width': w, 'height': 844})
            run(300)
            got = ev(FIT)
            check('a %d px: %s, sin palabras partidas ni textos fuera y sin desplazamiento lateral' % (w, 'dos columnas' if cols == 2 else 'tres (seis pistas)'), got == [cols, [], False], str(got))
        pg.set_viewport_size({'width': 390, 'height': 844})
        run(300)
        ev("document.querySelector('#sh .cat-card[data-v=\"Espalda\"]').click()")
        run(400)
        check('tocar una tarjeta abre su grupo, como antes', ev("libState.g") == 'Espalda' and ev("document.querySelectorAll('#lr .item-split').length") == real[1], str([ev("libState.g"), ev("document.querySelectorAll('#lr .item-split').length")]))
        ev("document.querySelector('#sh [data-a=libraryGroup][data-back]').click()")
        run(400)
        check('y «‹ Grupos» vuelve a las tarjetas', ev("!!document.querySelector('#sh .cat-grid')") and ev("libState.g") == '')
        ev("document.querySelector('#sh .cat-card[data-v=\"Propio\"]').click()")
        run(400)
        check('«Mis ejercicios» abre los del usuario', ev("libState.g") == 'Propio' and ev("document.querySelectorAll('#lr .item-split').length") == real[-1])
        ev("A.closeSheet()")
        run(300)

        check('la CSP no ha bloqueado nada de la app', not ev('window.__csp||[]'), str(ev('window.__csp||[]'))[:200])
        check('sin errores de JS', not errs, '; '.join(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN %d comprobaciones' % len(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
