"""El inglés: la app se puede poner en español o en inglés (Ajustes → Idiomas) y, si no se elige, sale en el idioma del móvil.

- Qué idioma sale: el elegido en Ajustes y, si no hay, el primero de los idiomas del móvil que sea español o inglés (si no
  hay ninguno, español). La página lo dice (<html lang>), antes incluso de que arranque la app (src/index.html).
- Ajustes → Idiomas: al elegir otro, la app se recarga en ese idioma y lo recuerda; «Automático» vuelve al del móvil.
- En inglés, pantalla a pantalla (las de tests/shots.py y tests/samehtml.py): no queda a la vista ningún texto en español.
  Lo que sí se queda como está: lo que escribió el usuario (aquí, los datos de prueba), el informe técnico de Diagnóstico
  (lo lee quien arregla la app) y los nombres propios de algunos alimentos. Un texto es español si lleva una palabra de las
  frases del diccionario que no sale en ningún texto en inglés de la app.
- Lo propio del inglés: fechas, el buscador (ejercicios y alimentos por su nombre en inglés), los consejos, la nota de la
  versión, los CSV (con coma y punto decimal), el PDF del análisis, el recordatorio para el calendario, la imagen para
  compartir un entreno, los nombres de los archivos y la pantalla de error del arranque.
- Las pantallas que el paseo no abre: «Cómo se hace», el reloj de un WOD, la semana de descarga, la bienvenida de una cuenta
  nueva y, sin sesión, la entrada a la app.
- Lo que se guarda no depende del idioma: con los mismos pasos, la app en inglés guarda lo mismo que en español.
- En español no cambia nada: ni se carga el diccionario.

  python3 tests/english.py dist/stratafit.html
"""
import os, re, sys, json, subprocess, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts
from shots import SCR, SEED, EXTRA, INIT
from samehtml import MORE

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
passes, fails = [], []


def check(name, cond, info=''):
    (passes if cond else fails).append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else str(info)[:600]))


# lo que se lee en la pantalla: el texto y los atributos que se leen, sin lo que escribe el usuario en un cuadro de texto ni
# el informe técnico (Diagnóstico, y «Ver los datos técnicos» al informar de un fallo), que va siempre en español
TEXTS = """(() => { const out = new Set(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const p = n.parentElement; if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName) || p.closest('.report-tech')) continue;
    const t = n.nodeValue.replace(/\\s+/g, ' ').trim(); if (t) out.add(t); }
  for (const e of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) for (const a of ['aria-label', 'placeholder', 'title', 'alt']) { const v = e.getAttribute(a); if (v && v.trim()) out.add(v.trim()); }
  return [...out]; })()"""
# un texto que parece español: una letra que el inglés no lleva o una palabra de las corrientes
SPANISH = re.compile(r"[áéíóúñ¿¡«»]|\b(de|del|la|el|los|las|un|una|con|para|por|tu|tus|que|sin|más|hoy|día|días|semana|semanas|serie|peso|entreno|entrenos|descanso|ejercicio|ejercicios|añadir|guardar|borrar|cerrar|nuevo|nueva|ronda|rondas|cada)\b", re.I)
# lo que se queda igual en los dos idiomas: la etiqueta de una técnica (parciales) y el archivo de la copia, que se llama siempre igual
SAME = {'PAR'}
# un texto entre comillas simples o dobles en el JavaScript de los datos de prueba
QUOTED = re.compile(r"""'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)" """.strip())
FIXED_NAMES = ['StrataFit-copia.json']
FIXED = '2026-10-29T12:00:00'
# los días y los meses como los escribe el navegador en inglés
DATES = ' Monday Tuesday Wednesday Thursday Friday Saturday Sunday Mon Tue Wed Thu Fri Sat Sun January February March April May June July August September October November December Jan Feb Mar Apr Jun Jul Aug Sep Sept Oct Nov Dec '


def wait(pg, expr, timeout=20000):
    """Espera a que `expr` se cumpla en la página, preguntando desde aquí (page.wait_for_function evalúa dentro de la página,
    y la política de seguridad de la app, que no admite eval, no lo deja en una página recién cargada)."""
    for _ in range(int(timeout / 100)):
        try:
            if pg.evaluate(expr):
                return True
        except Exception:
            pass
        pg.wait_for_timeout(100)
    return False


def dictionary():
    """El diccionario español → inglés de la app (tools/i18n.js --dump)."""
    return json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools', 'i18n.js'), '--dump'], capture_output=True, text=True, check=True).stdout)


def english_tips():
    """Los consejos en inglés (src/js/i18n/en-exinfo.js): nombre en español → [consejo, cómo se hace]."""
    t = open(os.path.join(ROOT, 'src', 'js', 'i18n', 'en-exinfo.js'), encoding='utf-8').read()
    rows = [l.split('|') for l in re.search(r'setExInfo\(`([\s\S]*)`\);', t).group(1).strip().split('\n')]
    return {r[0]: r[1:] for r in rows}


def tokens(s):
    return re.findall(r'[a-záéíóúüñ]+', s.lower())


def main(path):
    words = dictionary()
    tips = english_tips()
    # las palabras que solo son del español: las de las frases del diccionario que no salen en ningún texto en inglés de la
    # app (las traducciones, lo que no se traduce porque es igual, los consejos y la nota de la versión)
    skip = json.load(open(os.path.join(ROOT, 'tools', 'i18n-skip.json'), encoding='utf-8'))
    english = ' '.join(list(words.values()) + skip + [x for r in tips.values() for x in r]) + open(os.path.join(ROOT, 'CHANGELOG.en.md'), encoding='utf-8').read() + DATES
    spanish_only = {w for k in words for w in tokens(k) if len(w) > 2} - set(tokens(english))
    # una traducción que conserva una palabra española a propósito (un alimento con su nombre, un botón de GitHub) no es un resto
    kept = sorted((v for v in words.values() if SPANISH.search(v) or spanish_only & set(tokens(v))), key=len, reverse=True)

    # lo que escribió el usuario: los textos de los datos de prueba (tests/seed.js, tests/extra.js y lo que abre cada pantalla)
    # que no son frases del diccionario (el nombre de un ejercicio de la librería sí lo es, y tiene que salir en inglés)
    quoted = QUOTED.findall(' '.join([SEED, EXTRA] + list(SCR.values()) + list(MORE.values())))
    user = sorted({s for q in quoted for s in q if re.search(r'[A-Za-zÀ-ÿ]{3}', s) and s not in words}, key=len, reverse=True)

    def leftover(t):
        if t in SAME:
            return False
        for a in user + kept + FIXED_NAMES:
            t = t.replace(a, '')
        return bool(SPANISH.search(t)) or bool(spanish_only & set(tokens(t)))

    url = app_url(path)
    with sync_playwright() as p:
        b = launch(p)
        errs = []

        def context(locale, langs=None):
            c = b.new_context(viewport={'width': 390, 'height': 844}, locale=locale, **context_opts(path))
            c.add_init_script(INIT)
            if langs:
                c.add_init_script("Object.defineProperty(Navigator.prototype, 'languages', { get: () => %s, configurable: true })" % json.dumps(langs))
            c.add_init_script('window.__i18nMiss = new Set()')
            pg = c.new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            return c, pg

        # lo que dice la página de su idioma: el de la app (LANG), el de <html lang> y dos rótulos (la barra de pestañas y un botón)
        STATE = "[LANG, document.documentElement.lang, document.querySelectorAll('nav button')[3].textContent.trim(), tr('Guardar')]"
        ES, EN = ['es', 'es', 'Perfil', 'Guardar'], ['en', 'en', 'Profile', 'Save']

        print('Qué idioma sale')
        for locale, langs, want, name in [
                ('en-US', None, EN, 'móvil en inglés (Estados Unidos): inglés'),
                ('en-GB', None, EN, 'móvil en inglés (Reino Unido): inglés'),
                ('es-ES', None, ES, 'móvil en español: español'),
                ('es-MX', None, ES, 'móvil en español de México: español'),
                ('fr-FR', None, ES, 'móvil en otro idioma (francés): español'),
                ('fr-FR', ['fr-FR', 'en-US'], EN, 'francés y, después, inglés: inglés (el primero de los suyos que la app tiene)'),
                ('ca-ES', ['ca-ES', 'es-ES', 'en-US'], ES, 'catalán, español e inglés: español'),
                ('de-DE', ['de-DE', 'en-GB', 'es-ES'], EN, 'alemán, inglés y español: inglés')]:
            c, pg = context(locale, langs)
            pg.goto(url)
            got = pg.evaluate(STATE)
            check(name, got == want, got)
            c.close()
        for locale, saved, want, name in [
                ('en-US', 'es', ES, 'móvil en inglés con español elegido en Ajustes: español'),
                ('es-ES', 'en', EN, 'móvil en español con inglés elegido en Ajustes: inglés'),
                ('en-US', 'fr', EN, 'un idioma guardado que la app no tiene no cuenta: manda el móvil')]:
            c, pg = context(locale)
            pg.goto(url)
            pg.evaluate("localStorage.setItem('fflang', %r)" % saved)
            pg.reload()
            got = pg.evaluate(STATE)
            check(name, got == want, got)
            c.close()

        print('Ajustes → Idiomas')
        c, pg = context('es-ES')
        pg.goto(url)
        ev = pg.evaluate
        sheet = lambda: ev("document.querySelector('#sh').innerText")
        open_lang = "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'idioma'}})"
        rows = "[...document.querySelectorAll('#sh [data-a=setLanguage]')].map(b => [b.dataset.v, b.textContent.replace(/\\s+/g, ' ').trim(), b.getAttribute('aria-checked')])"
        ev("S.tab=3;R();A.openSettings()")
        pg.wait_for_timeout(300)
        row = ev("(r => r ? r.innerText.replace(/\\s+/g, ' ').trim() : '')([...document.querySelectorAll('#sh .setting-row, #sh [data-a=openSettingsPage]')].find(r => /Idiomas/.test(r.textContent)))")
        check('en Ajustes hay una fila «Idiomas», que dice cuál está puesto', 'Idiomas' in row and 'Automático' in row, row)
        ev(open_lang)
        pg.wait_for_timeout(300)
        got = ev(rows)
        check('la página tiene las tres opciones: automático (con el del móvil), español e inglés', got == [['', 'Automático · Español', 'true'], ['es', 'Español', 'false'], ['en', 'English', 'false']], got)
        ev("document.querySelector('#sh [data-a=setLanguage][data-v=es]').click()")
        pg.wait_for_timeout(400)
        check('elegir el que ya se ve no recarga la app: lo apunta', ev("localStorage.getItem('fflang')") == 'es' and ev(STATE) == ES and ev("!!document.querySelector('#sh [data-a=setLanguage]')"), ev(STATE))
        with pg.expect_navigation():
            ev("document.querySelector('#sh [data-a=setLanguage][data-v=en]').click()")
        ev("window.__ffready || null")
        check('al elegir inglés, la app se recarga en inglés y lo guarda en el móvil', ev(STATE) == EN and ev("localStorage.getItem('fflang')") == 'en', ev(STATE))
        pg.reload()
        check('y sigue en inglés al volver a abrirla', ev(STATE) == EN, ev(STATE))
        ev(open_lang)
        pg.wait_for_timeout(300)
        got = ev(rows)
        check('la página, ya en inglés, marca «English»; cada idioma se llama como en su idioma', got == [['', 'Automatic · Español', 'false'], ['es', 'Español', 'false'], ['en', 'English', 'true']] and 'Languages' in sheet(), str(got) + sheet()[:80])
        with pg.expect_navigation():
            ev("document.querySelector('#sh [data-a=setLanguage][data-v=\"\"]').click()")
        ev("window.__ffready || null")
        check('«Automático» vuelve al idioma del móvil y borra la elección', ev(STATE) == ES and ev("localStorage.getItem('fflang')") is None, ev(STATE))
        c.close()

        print('En inglés, pantalla a pantalla')
        c, pg = context('en-US')
        ev = pg.evaluate
        seen, again, empty = {}, {}, []
        # (SF_ENGLISH_SCREENS=10 deja el paseo en sus diez primeras pantallas, para probar la prueba)
        screens = (list(SCR) + list(MORE))[:int(os.environ.get('SF_ENGLISH_SCREENS', 999))]
        for k in screens:
            try:
                pg.goto(url)
                ev('localStorage.clear()')
                pg.reload()
                pg.clock.set_fixed_time(FIXED)
                ev(SEED)
                ev(EXTRA)
                pg.reload()
                pg.clock.set_fixed_time(FIXED)
                ev(SCR[k] if k in SCR else MORE[k])
                pg.wait_for_timeout(900 if k in ('edit', 'overview', 'go_open') else 350)
                texts = ev(TEXTS)
                if len(texts) < 5:
                    empty.append(k)
                for t in texts:
                    if leftover(t):
                        seen.setdefault(t, k)
                # lo que se ve y la app sabría traducir: se ha escrito en la página sin pasar por el diccionario
                for t in ev('(' + TEXTS + ').filter(t => tr(t) !== t)'):
                    again.setdefault(t, k)
            except Exception as e:
                errs.append(k + ': ' + str(e)[:160])
        check('las %d pantallas se pintan' % len(screens), not empty, empty)
        if os.environ.get('SF_ENGLISH_DUMP'):
            json.dump(seen, open(os.environ['SF_ENGLISH_DUMP'], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
        check('ningún texto a la vista en español', not seen, json.dumps([[k, t[:90]] for t, k in list(seen.items())[:40]], ensure_ascii=False))
        check('ninguno que la app sabría traducir y ha escrito sin traducir', not again, json.dumps([[k, t[:90]] for t, k in list(again.items())[:12]], ensure_ascii=False))

        print('Lo propio del inglés')

        def fresh(js=''):
            pg.goto(url)
            ev('localStorage.clear()')
            pg.reload()
            pg.clock.set_fixed_time(FIXED)
            ev(SEED)
            ev(EXTRA)
            pg.reload()
            pg.clock.set_fixed_time(FIXED)
            if js:
                ev(js)
                pg.wait_for_timeout(400)
        sheet = lambda: ev("document.querySelector('#sh').innerText")
        fresh("A.openLogs ? A.openLogs() : (S.tab=2,R())")
        body = ev("document.body.innerText")
        check('las fechas van como en inglés (Mon, Oct 26)', bool(re.search(r'\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}\b', body)) and not re.search(r'\b(lun|mar|mié|jue|vie|sáb|dom), \d', body), body[:300])
        stored = ev("S.logs.filter(l => l.k == 'w').map(l => l.x)")
        check('un WOD guardado en español («5 rondas + 7 reps») se lee en inglés, y guardado sigue igual', any('rondas' in x for x in stored) and '5 rounds + 7 reps' in body and 'rondas' not in body, str(stored) + body[:200])

        fresh("A.openLibrary()")
        first = ev("exAll()[0].n")
        ev("U.librarySearch('bench press')")
        pg.wait_for_timeout(400)
        found = sheet()
        check('el buscador de ejercicios encuentra por el nombre en inglés («bench press»)', 'Bench press' in found and words.get('Press banca') == 'Bench press', found[:200])
        ev("U.librarySearch('press banca')")
        pg.wait_for_timeout(400)
        check('y también por el nombre en español, que se enseña en inglés', 'Bench press' in sheet() and 'Press banca' not in sheet(), sheet()[:200])
        ev("A.openLibrary();A.exerciseDetail(0)")
        wait(pg, "document.querySelector('#sh').innerText.length > 200")
        pg.wait_for_timeout(500)
        tip = tips.get(first, ['', ''])[0]
        check('la ficha de un ejercicio da su consejo en inglés', bool(tip) and tip in sheet(), first + ' | ' + sheet()[:400])

        fresh("S.tab=1;R();A.openAddFood(0)")
        ev("U.foodSearch('chicken')")
        pg.wait_for_timeout(300)
        got = ev("[...document.querySelectorAll('#rs .item span')].map(e => e.firstChild.textContent.trim())")
        check('el buscador de alimentos encuentra por el nombre en inglés («chicken»)', len(got) > 2 and all('chicken' in x.lower() for x in got), got[:6])
        ev("U.foodSearch('pollo')")
        pg.wait_for_timeout(300)
        got2 = ev("[...document.querySelectorAll('#rs .item span')].map(e => e.firstChild.textContent.trim())")
        check('y por el español, con los nombres en inglés', len(got2) > 2 and not any('pollo' in x.lower() for x in got2), got2[:6])
        ev("U.foodSearch('')")
        pg.wait_for_timeout(300)
        names = ev("[...document.querySelectorAll('#rs .item:not(.own-food) span')].map(e => e.firstChild.textContent.trim())")
        order = ev("(n => n.slice().sort((a, b) => a.localeCompare(b, 'en-US')).join('|') == n.join('|'))(%s.map(x => x.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')))" % json.dumps(names))
        check('la lista de alimentos va por orden alfabético del nombre en inglés', len(names) > 300 and order, names[:8])

        fresh("S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'nota'}})")
        note = ev("document.querySelector('#sh').textContent")
        check('la nota de la versión, en inglés (CHANGELOG.en.md)', 'App review and 3D model' in note and "What's new" in note and 'Improvements' in note and 'Novedades' not in note and 'Mejoras' not in note, note[:300])

        # lo que la app guarda como archivo (un CSV, el PDF, el recordatorio del calendario, la imagen de un entreno), con su
        # nombre y su contenido; y lo que escribe en un lienzo
        HOOK = """(() => { window.__files = []; window.__drawn = []; const o = URL.createObjectURL; URL.createObjectURL = b => { if (!/^image\\/(webp|svg)/.test(b.type)) window.__files.push({ b, n: '' }); return o.call(URL, b); };
          const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download && window.__files.length) window.__files[window.__files.length - 1].n = this.download; return c.call(this); };
          const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (s) { window.__drawn.push(String(s)); return f.apply(this, arguments); }; })()"""
        last = lambda kind: ev("(f => f ? f.b.arrayBuffer().then(a => [f.n, new TextDecoder(%r).decode(a)]) : ['', ''])(window.__files.filter(f => /%s/.test(f.b.type)).pop())" % ('windows-1252' if kind == 'pdf' else 'utf-8', kind))
        ev(HOOK)
        ev("A.openCsvExport()")
        pg.wait_for_timeout(300)
        ev("document.querySelector('[data-a=csvDownload][data-v=peso]').click()")
        pg.wait_for_timeout(400)
        fname, text = last('csv')
        csv = text.lstrip('﻿').strip('\r\n').split('\r\n')
        check('un CSV en inglés: cabecera en inglés, separado por comas y con punto decimal', csv[0] == 'Date,Weight (kg)' and len(csv) > 2 and all(re.fullmatch(r'\d{4}-\d\d-\d\d,\d+(\.\d+)?', r) for r in csv[1:]), csv[:4])
        check('y su archivo, con el nombre en inglés', re.fullmatch(r'stratafit-body-weight-\d{4}-\d\d-\d\d\.csv', fname) is not None, fname)

        fresh("S.tab=3;R();A.openAnalysis()")
        ev(HOOK)
        wait(pg, "!!document.querySelector('[data-a=analysisDownloadPdf]')")
        page_text = ev("document.querySelector('#sh').innerText")
        ev("document.querySelector('[data-a=analysisDownloadPdf]').click()")
        wait(pg, "window.__files.some(f => /pdf/.test(f.b.type))")
        pg.wait_for_timeout(300)
        fname, pdf = last('pdf')
        lines = [re.sub(r'\\([()\\])', r'\1', s) for s in re.findall(r'\(((?:[^()\\]|\\.)*)\)\s*Tj', pdf)]
        bad = [s for s in lines if leftover(s)]
        check('el PDF del análisis mensual, en inglés: sus %d textos' % len(lines), fname == 'StrataFit-analysis-2026-10.pdf' and len(lines) > 30 and not bad and any('October 2026' in s for s in lines) and 'Workouts' in lines, fname + ' ' + str(bad[:6] or lines[:8]))
        check('con los mismos apartados que la pantalla', all(w in lines and w.upper() in page_text.upper() for w in ['Workouts', 'Nutrition']), str(lines[:14]))

        fresh("S.weighReminder={on:1,n:1,u:'w',wd:1};S.tab=2;R();A.openWeight()")
        ev(HOOK)
        ev("A.weighReminderCalendar()")
        wait(pg, "window.__files.some(f => /calendar/.test(f.b.type))")
        fname, ics = last('calendar')
        check('el recordatorio de pesaje para el calendario del móvil, en inglés', fname == 'StrataFit-weigh-in.ics' and 'SUMMARY:Weigh-in day' in ics and 'pesarse' not in ics, fname + ' ' + ics[:300])

        fresh("S.tab=0;R();A.startWorkout()")
        pg.wait_for_timeout(600)
        ev(HOOK)
        ev("W.sets[0][0].ok=1;A.finishSave()")
        pg.wait_for_timeout(800)
        ev("A.summaryShare()")
        wait(pg, "window.__files.some(f => /png/.test(f.b.type))")
        drawn = [s for s in ev("window.__drawn") if re.search(r'[A-Za-zÀ-ÿ]{2}', s)]
        bad = [s for s in drawn if leftover(s)]
        check('la imagen para compartir un entreno, en inglés: sus %d textos' % len(drawn), len(drawn) >= 6 and not bad and 'Logged with StrataFit' in drawn and ev("window.__files.filter(f => /png/.test(f.b.type)).pop().n") == 'stratafit-workout.png', str(bad[:6] or drawn) + str(ev("window.__files.map(f => [f.b.type, f.n])")))
        check('con la fecha entera y la comparación con el entreno anterior', any(re.fullmatch(r'(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day, [A-Z][a-z]+ \d{1,2}, \d{4}', s) for s in drawn) and any('vs. the previous workout' in s for s in drawn), str(drawn))

        print('Más pantallas en inglés')
        # las que el paseo no abre: lo que se pone con el código fuera de las plantillas (el reloj del WOD), la bienvenida de
        # una cuenta nueva y, sin sesión, la entrada a la app
        def look(name, where=None):
            texts = ev(TEXTS)
            bad = [t for t in texts if leftover(t)] + ev('(' + TEXTS + ').filter(t => tr(t) !== t)')
            check(name, len(texts) >= 5 and not bad and (where is None or where(' | '.join(texts))), str(bad[:6] or texts[:8]))
        fresh("A.openLibrary();A.exerciseDetail(0)")
        pg.wait_for_timeout(500)
        ev("A.exerciseHowTo(0,{dataset:{n:exAll()[0].n}})")
        pg.wait_for_timeout(1200)
        look('«Cómo se hace»: la figura, sus músculos y los pasos', lambda t: 'How to do it' in t and tips[first][1][:60] in t)
        fresh("S.wodConfig={m:'amrap',a:3,pre:10};A.openWod()")
        ev("A.wodGo()")
        pg.wait_for_timeout(700)
        en = lambda es, *v: re.sub(r'\{(\d)\}', lambda m: str(v[int(m.group(1))]), words[es])
        look('el reloj de un WOD, en la cuenta atrás', lambda t: en('Prepárate') in t and en('Después: {0}', 'AMRAP 3 min') in t)
        ev("A.wodSkipCountdown()")
        pg.wait_for_timeout(700)
        ev("A.wodPause()")
        pg.wait_for_timeout(400)
        look('y en pausa', lambda t: en('En pausa') in t and en('Seguir') in t)
        ev("A.wodQuitConfirmed();S.wodConfig={m:'tabata',tw:20,tr:10,tn:8,pre:0};A.openWod()")
        pg.wait_for_timeout(400)
        ev("A.wodGo()")
        pg.wait_for_timeout(1500)
        look('un Tabata: la ronda y lo que viene después', lambda t: en('Ronda {0} de {1}', 1, 8) in t and en('Después: descanso {0}', '0:10') in t)
        fresh("S.deloadWeeks={1:1};S.deloadSheetWeek=1;saveState();R()")
        look('la semana de descarga')
        # el material del día al final del Overview y su página (V1.0.4): los nombres del material son datos (data/equipment)
        fresh("A.openOverview(0)")
        pg.wait_for_timeout(500)
        lab = ev("(document.querySelector('#app .equip-open')||{getAttribute:()=>''}).getAttribute('aria-label')")
        check('«Equipamiento» en el Overview: su título y la lista de su botón, en inglés', re.match(r'^Equipment \(\d+\): .*, and ', lab or '') is not None and not leftover(lab), lab)
        ev("A.openEquipment()")
        pg.wait_for_timeout(500)
        look('y su página', lambda t: 'Equipment needed for this session' in t and 'Bench press rack' in t)
        # las tarjetas de los grupos de la librería (V1.0.4): los nombres aprobados, su número en singular o plural y la leyenda
        fresh("A.openLibrary()")
        pg.wait_for_timeout(500)
        cat = ev("[...document.querySelectorAll('#sh .cat-card')].map(c => [c.querySelector('.cat-name').textContent, c.querySelector('.cat-count').textContent, c.getAttribute('aria-label')])")
        check('la librería en inglés: los nombres aprobados de sus 14 tarjetas, y «My exercises»', [x[0] for x in cat] == ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Abs', 'Quadriceps', 'Hamstrings & glutes', 'Calves', 'CrossFit', 'Hyrox', 'Functional', 'Cardio', 'My exercises'], str([x[0] for x in cat]))
        check('con su número en inglés («1 exercise», en singular) y su etiqueta', bool(cat) and all(re.match(r'^\d+ exercises?$', x[1]) for x in cat) and cat[-1][1] == '1 exercise' and all(x[2] == x[0] + ': ' + x[1] for x in cat), str(cat[-2:]))
        look('y su leyenda', lambda t: 'Primary muscle (main work)' in t and 'Secondary muscle (assistance)' in t)
        # (en una página con el reloj en marcha: la bienvenida espera un momento desde que arranca la app)
        c.close()
        c, pg = context('en-US')
        ev = pg.evaluate
        pg.goto(url)
        ev(SEED)
        ev(EXTRA)
        ev("markNewAccount();delete S.tourSeen;S.biometrics={};S.tab=2;saveState()")
        pg.reload()
        wait(pg, "!!document.getElementById('wlc')")
        look('la bienvenida de una cuenta nueva', lambda t: words['Gracias por instalar la app y por apoyar su desarrollo.'] in t)
        ev("document.querySelector('#wlc [data-a=welcomeNext]').click()")
        pg.wait_for_timeout(500)
        look('y sus datos (sexo, edad, altura y peso)')
        ev("A.welcomeSave()")
        pg.wait_for_timeout(400)
        look('con su aviso si faltan')
        c.close()
        c = b.new_context(viewport={'width': 390, 'height': 844}, locale='en-US', **context_opts(path))
        c.add_init_script('window.__sfNoSession=1;')
        c.add_init_script(INIT)
        pg = c.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        ev = pg.evaluate
        pg.goto(url)
        wait(pg, "!!document.querySelector('#lgw .login-submit')")
        look('sin sesión, la entrada: iniciar sesión', lambda t: 'Sign in' in t or 'Log in' in t)
        ev("document.querySelector('#lgw [data-a=loginMode][data-v=up]').click()")
        pg.wait_for_timeout(300)
        look('crear una cuenta')
        ev("A.loginSubmit()")
        pg.wait_for_timeout(500)
        look('con su aviso si falta algo')
        ev("A.openLegal(0,{dataset:{v:'privacy'}})")
        pg.wait_for_timeout(300)
        look('y la privacidad', lambda t: 'StrataFit privacy policy' in t and 'the Spanish version prevails' in t and 'Last updated: November 25, 2026' in t)
        ev("A.openLegal(0,{dataset:{v:'terms'}})")
        pg.wait_for_timeout(300)
        look('y el aviso legal', lambda t: 'Legal notice and terms of use' in t and 'the Spanish version prevails' in t)
        ev("A.openLegal(0,{dataset:{v:'consent'}})")
        pg.wait_for_timeout(300)
        look('y el consentimiento para los datos de salud', lambda t: 'Informed consent for the processing of health data' in t and 'the Spanish version prevails' in t and 'Withdraw consent' in t)
        c.close()
        c, pg = context('en-US')
        ev = pg.evaluate
        pg.goto(url)
        ev("window.__ffe('boom')")
        boot = ev("[...document.querySelectorAll('#ffe h2, #ffe p, #ffe button')].map(e => e.textContent)")
        check('la pantalla de error del arranque, en inglés', boot == ['StrataFit couldn’t start', 'This is what went wrong. If it keeps happening, send me a screenshot of this message.', 'Try again', 'See my data (backup)', 'Reset and open again'], boot)
        c.close()

        print('Lo que se guarda no depende del idioma')

        def saved(locale):
            c, pg = context(locale)
            pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
            pg.goto(url)
            ev = pg.evaluate
            ev('localStorage.clear()')
            pg.reload()
            ev(SEED)
            ev(EXTRA)
            pg.reload()
            run = lambda ms=400: pg.clock.run_for(ms)
            ff = lambda ms: (pg.clock.fast_forward(ms), run(300))
            typed = lambda sel, v: ev("(e => { e.value = %r; e.dispatchEvent(new Event('input', { bubbles: true })); })(document.querySelector(%r))" % (str(v), sel))
            run(600)
            before = ev("[S.logs.length, Object.values(S.meals).reduce((n, m) => n + Object.values(m).reduce((k, l) => k + l.length, 0), 0)]")
            # un entreno del plan, con una serie hecha
            ev("S.tab=0;R();A.startWorkout()")
            run(600)
            ev("W.sets[0][0].ok=1;A.finishSave()")
            run(600)
            ev("sheet()")
            # un cardio
            ev("A.openCardio()")
            run()
            typed('#f2cdk', '5.2'); typed('#f2cdm', 31); typed('#f2cds', 20)
            ev("A.cardioSave()")
            run()
            # tres WOD: por rondas con repeticiones sueltas, por intervalos y contrarreloj con tope
            wod = lambda cfg: (ev("S.wodConfig=%s;A.openWod()" % cfg), run(), ev("A.wodGo()"), run(300))
            wod("{m:'amrap',a:3,pre:0}")
            ff(181000)
            typed('#f2r', 5); typed('#f2e', 7)
            ev("A.wodSave()")
            run()
            wod("{m:'tabata',tw:20,tr:10,tn:8,pre:0}")
            ff(241000)
            ev("A.wodSave()")
            run()
            wod("{m:'ft',ct:2,pre:0}")
            ff(30000)
            ev("A.wodRound()")
            ff(91000)
            ev("A.wodSave()")
            run()
            # un alimento en una comida
            ev("S.tab=1;R();A.openAddFood(0)")
            run()
            ev("A.pickFood(3)")
            run()
            ev("A.addFood()")
            run()
            out = ev("[LANG, JSON.stringify(S), S.logs.filter(l => l.k == 'c' || l.k == 'w').map(l => l.n + ' | ' + l.x), [S.logs.length, Object.values(S.meals).reduce((n, m) => n + Object.values(m).reduce((k, l) => k + l.length, 0), 0)]]")
            c.close()
            return out + [[out[3][0] - before[0], out[3][1] - before[1]]]
        es, en = saved('es-ES'), saved('en-US')
        # el momento exacto de cada apunte (en milisegundos) cambia de una pasada a otra: no cuenta
        moment = lambda s: re.sub(r'\b1793\d{9}\b', '0', s)
        a, e2 = json.loads(moment(es[1])), json.loads(moment(en[1]))
        diff = sorted(k for k in set(a) | set(e2) if a.get(k) != e2.get(k))
        check('los pasos se hacen en los dos idiomas: un entreno, un cardio, tres WOD y un alimento', es[4] == [5, 1] and en[4] == [5, 1], '%s %s' % (es[4], en[4]))
        check('y en inglés se guarda lo mismo que en español', es[0] == 'es' and en[0] == 'en' and not diff,
              json.dumps({k: [json.dumps(a.get(k), ensure_ascii=False)[:160], json.dumps(e2.get(k), ensure_ascii=False)[:160]] for k in diff[:4]}, ensure_ascii=False))
        check('los títulos y resultados de cardio y WOD van en español, que es como se guardan', len(es[2]) >= 4 and es[2] == en[2] and any('rondas' in x for x in es[2]) and any('Carrera' in x or 'Cardio' in x for x in es[2]), es[2])

        print('En español no cambia nada')
        c, pg = context('es-ES')
        pg.goto(url)
        ev = pg.evaluate
        ev(SEED)
        ev(EXTRA)
        pg.reload()
        ev("S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'nota'}})")
        pg.wait_for_timeout(300)
        note = ev("document.querySelector('#sh').textContent")
        check('la nota de la versión, en español', 'Revisión de la aplicación y modelo 3D' in note and 'Novedades' in note and "What's new" not in note, note[:200])
        check('no se busca nada en el diccionario (ni se carga)', ev("window.__i18nMiss.size") == 0 and ev("tr('Guardar')") == 'Guardar' and ev("say`Ronda ${1} de ${2}`") == 'Ronda 1 de 2')
        ev("window.__ffe('boom')")
        check('la pantalla de error del arranque, en español', ev("document.querySelector('#ffe h2').textContent") == 'StrataFit no ha podido iniciarse')
        c.close()

        errs = [e for e in errs if 'favicon' not in e]
        check('sin errores de JS', not errs, errs[:4])
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1])
