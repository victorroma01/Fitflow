"""Prueba de Perfil, ajustes y seguimiento (M5): recordatorio de pesaje (F-25, T-13), análisis mensual y su PDF (F-26, T-15),
nota de actualización (F-28) y copia de seguridad con nombre fijo (F-30, T-14). Fallos y sugerencias con el admin y la copia en
la nube van en tests/cloud.py (con su Firebase de prueba); el formulario sin conexión, en tests/features.py.

  python3 tests/followup.py dist/stratafit.html
Requiere:  pip install playwright  &&  playwright install chromium   (otro motor: SF_BROWSER=webkit; ver tests/browser.py)
"""
import os, re, sys, datetime, tempfile
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


fails = []


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


# dos meses de datos (septiembre y octubre de 2026): entrenos de fuerza, cardio y WOD, historial con mejoras, peso que baja,
# comidas de octubre cerca del objetivo (2200 kcal), medidas y un logro
SEED = """(()=>{
 const pad=n=>String(n).padStart(2,'0');
 S.logs=[];S.hist={};S.meals={};S.wt={};
 for(const m of [9,10])for(let d=1;d<=(m==9?30:31);d++){const k='2026-'+pad(m)+'-'+pad(d);const t=new Date(k+'T12:00:00');const wd=t.getDay();const oct=m==10;
  if([1,2,4,5].includes(wd)&&!(oct&&wd==5&&d>20))S.logs.push({d:k,n:'Fuerza',v:oct?5200:4800,s:18,m:60,q:oct?8:7});
  if(oct&&wd==6)S.logs.push({d:k,n:'Cardio · Correr',v:0,s:0,m:30,q:0,k:'c',c:{t:'run',km:5,sec:1800}});
  if(oct&&wd==0&&d<15)S.logs.push({d:k,n:'WOD · AMRAP 12 min',v:0,s:0,m:15,q:0,k:'w',x:'5 rondas'});
  if([1,4].includes(wd)){(S.hist['Press banca']=S.hist['Press banca']||[]).unshift({d:k,s:[[5,oct?(d>15?85:82.5):80,8,0]]});(S.hist['Sentadilla']=S.hist['Sentadilla']||[]).unshift({d:k,s:[[6,100,8,0]]})}
  if(oct&&d<=28&&d%7!=3){const kc=2200+((d*137)%600)-300;S.meals[k]={0:[{n:'Avena',g:100,b:[370,60,13,7,10,0]}],1:[{n:'Pollo y arroz',g:Math.round((kc-370)/1.6),b:[160,18,14,3,1,0]}]};S.wt[k]=2000}}
 S.wl=[{d:'2026-09-01',w:81.4},{d:'2026-09-29',w:80.6},{d:'2026-10-06',w:80.3},{d:'2026-10-20',w:79.7},{d:'2026-10-27',w:79.4}];
 S.ms=[{d:'2026-09-02',v:{ci:85}},{d:'2026-10-28',v:{ci:83}}];S.ach={n1:'2026-10-08'};
 S.nu={k:2200,c:45,p:30,f:25,n:3};S.bio={age:34,h:178,w:79.4,sex:'M',act:2,goal:0};saveState()})()"""


def main(path):
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', accept_downloads=True, **context_opts(path))
        c.add_init_script(rd('init.js'))
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        # miércoles 4 de noviembre de 2026
        pg.clock.install(time=datetime.datetime(2026, 11, 4, 10, 0, 0))
        pg.goto(app_url(path))
        pg.clock.run_for(1500)
        ev = pg.evaluate
        run = lambda ms=400: pg.clock.run_for(ms)
        txt = lambda sel: ev("(e=>e?e.innerText:'')(document.querySelector(%r))" % sel)
        tmp = tempfile.mkdtemp()

        def download(click, wait_ms=2000):
            with pg.expect_download() as dl:
                ev(click)
                for _ in range(wait_ms // 200):
                    run(200)
                    pg.wait_for_timeout(30)
            d = dl.value
            f = os.path.join(tmp, d.suggested_filename)
            d.save_as(f)
            return d.suggested_filename, open(f, 'rb').read()

        print('Recordatorio de pesaje (F-25, T-13)')
        ev("delete S.wr;S.wl=[{d:'2026-11-02',w:80}];S.tab=2;R();A.openWeight()")
        run()
        check('en Evolución del peso, debajo de «Registrar peso», se activa el recordatorio', ev("!!document.querySelector('.wrc [data-c=weighReminderToggle]')") and ev("(a=>a.compareDocumentPosition(document.querySelector('.wrc'))&4)(document.querySelector('[data-a=weightAdd]'))") > 0)
        ev("(e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('[data-c=weighReminderToggle]'))")
        run()
        check('por defecto, cada 2 semanas desde hoy', ev("S.wr.n==2&&S.wr.u=='w'") and '18 de noviembre' in txt('.wrc .wrt'), txt('.wrc .wrt'))
        steps = ev("[...document.querySelectorAll('.wrs [data-a=weighReminderInterval]')].map(b=>b.innerText)")
        check('intervalos: 2 semanas, 4 semanas, un mes, 5 semanas u otro', steps == ['2 semanas', '4 semanas', '1 mes', '5 semanas', 'Otro'], str(steps))
        ev("document.querySelector('[data-a=weighReminderInterval][data-i=\"2\"]').click()")
        run()
        check('un mes: el mismo día del mes siguiente', '4 de diciembre' in txt('.wrc .wrt') and 'cada mes' in txt('.wrc .wrt'), txt('.wrc .wrt'))
        ev("document.querySelector('[data-a=weighReminderInterval][data-i=\"-1\"]').click()")
        run()
        ev("(e=>{e.value='d';e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('[data-c=weighReminderUnit]'))")
        run()
        ev("(e=>{e.value='10';e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('[data-c=weighReminderEvery]'))")
        run()
        check('«Otro»: cada cuántos días, semanas o meses', ev("S.wr.n==10&&S.wr.u=='d'") and '14 de noviembre' in txt('.wrc .wrt'), txt('.wrc .wrt'))
        ev("(e=>{e.value='500';e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('[data-c=weighReminderEvery]'))")
        run()
        check('con un tope razonable (90 días)', ev("S.wr.n") == 90)
        ev("document.querySelector('[data-a=weighReminderInterval][data-i=\"0\"]').click()")
        run()
        name, data = download("document.querySelector('[data-a=weighReminderCalendar]').click()")
        ics = data.decode('utf-8')
        check('«Añadir al calendario» crea un evento que se repite con su aviso (.ics)', name == 'StrataFit-pesaje.ics' and 'RRULE:FREQ=WEEKLY;INTERVAL=2' in ics and 'BEGIN:VALARM' in ics and 'DTSTART:20261118T090000' in ics and 'SUMMARY:Día de pesarse' in ics, name + ' ' + ics[:200])
        check('con líneas de calendario de verdad (CRLF) y siempre el mismo id', '\r\n' in ics and ev("S.wr.c") and ('UID:stratafit-pesaje-' + ev("S.wr.c")) in ics)
        # toca: último pesaje hace tres semanas
        ev("S.wr={n:2,u:'w',t:Date.parse('2026-10-01T12:00:00')};S.wl=[{d:'2026-10-14',w:79.6}];saveState();A.weightBack();S.tab=0;R()")
        run()
        ev("document.dispatchEvent(new Event('visibilitychange'))")
        run(1500)
        check('cuando toca, al volver a la app sale «Día de pesarse»', 'Día de pesarse' in txt('#dg') and '14 de octubre' in txt('#dg'), txt('#dg')[:120])
        ev("document.querySelector('#dg [data-v=weighReminderLater]').click()")
        run()
        ev("document.dispatchEvent(new Event('visibilitychange'))")
        run(1500)
        check('«Mañana»: hoy no vuelve a salir', not txt('#dg').strip() and ev("S.wr.sn") == '2026-11-05')
        ev("S.tab=2;R()")
        run()
        check('ni la tarjeta del Dashboard', not ev("!!document.querySelector('.wrb')"))
        pg.clock.fast_forward(86400000)
        run()
        ev("S.tab=2;R()")
        run()
        check('al día siguiente, la tarjeta arriba del Dashboard', 'Día de pesarse' in txt('.wrb') and 'cada 2 semanas' in txt('.wrb'), txt('.wrb'))
        ev("document.dispatchEvent(new Event('visibilitychange'))")
        run(1500)
        check('y el aviso, una vez ese día', 'Día de pesarse' in txt('#dg'))
        ev("document.querySelector('#dg [data-v=weighReminderGo]').click()")
        run()
        check('«Registrar peso» lleva a Evolución del peso', ev("S.tab") == 2 and ev("!!document.querySelector('#wv')"))
        ev("document.dispatchEvent(new Event('visibilitychange'))")
        run(1500)
        check('ya avisado hoy: no se repite', not txt('#dg').strip())
        ev("document.querySelector('#wv').value='79.2';A.weightAdd()")
        run()
        ev("A.weightBack()")
        run()
        check('al registrar el peso, el ciclo empieza de nuevo', not ev("!!document.querySelector('.wrb')") and '19 de noviembre' in (ev("(A.openWeight(),document.querySelector('.wrc .wrt').innerText)") or ''))

        print('Análisis mensual (F-26, T-15)')
        ev("S.logs=[{d:'2026-10-20',n:'Fuerza',v:4000,s:16,m:55,q:7}];S.meals={};S.wl=[];S.ms=[];S.tab=3;R()")
        run()
        check('en Perfil, «Ver análisis mensual»', ev("!!document.querySelector('#app [data-a=openAnalysis]')"))
        check('antes del primer mes de uso dice desde cuándo estará', 'Disponible desde el 19 de noviembre' in txt('#app [data-a=openAnalysis]'), txt('#app [data-a=openAnalysis]'))
        ev("A.openAnalysis()")
        run(600)
        check('y la pantalla lo explica', 'Aún no hay análisis' in txt('#sh') and '19 de noviembre' in txt('#sh'))
        ev("sheet()")
        ev(SEED)
        run()
        ev("S.tab=3;R()")
        run()
        check('con más de un mes de datos, ya está', 'también en PDF' in txt('#app [data-a=openAnalysis]'))
        ev("A.openAnalysis()")
        run(600)
        check('se abre en una pantalla propia', ev("document.querySelector('#sh').className") == 'full' and ev("!!document.querySelector('#anp')"))
        check('a primeros de mes enseña el mes anterior, completo', 'Octubre 2026' in txt('.anm') and 'del 1 al 31' in txt('.anm'), txt('.anm'))
        k = ev("[...document.querySelectorAll('.ank')].map(x=>x.innerText.replace(/\\s+/g,' '))")
        check('cifras: entrenos con su comparación con el mes anterior', k[0].startswith('Entrenos 23 +6 vs. mes anterior'), str(k[:2]))
        check('récords (mejor 1RM estimado que antes del mes)', k[3].startswith('Récords 1'), k[3])
        check('peso: cuánto cambia y hacia dónde', k[4].startswith('Peso −1,2 kg baja'), k[4])
        an = txt('#anp')
        check('entrenamientos: fuerza, WOD y cardio, con los km', '16 entrenos de fuerza, 2 WOD, 5 sesiones de cardio (25 km)' in an, an[:400])
        check('frente a lo que marca el plan, por semanas', ev("document.querySelectorAll('.anc')[0].querySelectorAll('rect').length") == 5 and 'Tu plan marca' in an)
        check('el récord, con el antes y el después', 'Press banca' in an and '93 → 99 kg' in an and '+6 %' in an, an[an.find('Récords del mes'):][:120])
        check('peso: gráfica del mes y si va con el objetivo', ev("!!document.querySelectorAll('.anc')[1].querySelector('polyline')") and 'Baja 1,2 kg' in an and 'objetivo Definir: va bien' in an)
        check('alimentación: si se cumple el objetivo', 'Cumplido' in an and '24 de 31 días con comidas registradas' in an and 'objetivo 2200' in an, an[an.find('Alimentación'):][:300])
        check('con las kcal de cada día en colores', ev("document.querySelectorAll('.anc')[2].querySelectorAll('rect').length") >= 24)
        check('otros datos: medidas, logros y agua', 'Cintura' in an and '−2 cm' in an and 'Diario de comidas' in an and 'Agua: 2 l al día' in an)
        con = ev("[...document.querySelectorAll('.anu li')].map(x=>x.innerText)")
        check('y una conclusión en frases cortas', len(con) >= 4 and con[0].startswith('Has entrenado 23 veces (6 más que en septiembre)') and any('como buscas con tu objetivo (Definir)' in x for x in con), str(con))
        check('‹ va a septiembre y › está al final', ev("document.querySelector('[data-a=analysisMonth][data-i=\"1\"]').disabled") is False)
        ev("document.querySelector('[data-a=analysisMonth][data-i=\"-1\"]').click()")
        run()
        check('septiembre: el primer mes, con su propio resumen', 'Septiembre 2026' in txt('.anm') and ev("document.querySelector('[data-a=analysisMonth][data-i=\"-1\"]').disabled"), txt('.anm'))
        ev("document.querySelector('[data-a=analysisMonth][data-i=\"1\"]').click()")
        run()
        ev("document.querySelector('[data-a=analysisMonth][data-i=\"1\"]').click()")
        run()
        check('noviembre, en curso: hasta hoy', 'Noviembre 2026' in txt('.anm') and 'del 1 al 5 (en curso)' in txt('.anm'), txt('.anm'))
        ev("document.querySelector('[data-a=analysisMonth][data-i=\"-1\"]').click()")
        run()
        name, pdf = download("document.querySelector('[data-a=analysisDownloadPdf]').click()", 3000)
        check('«Descargar PDF» guarda el análisis en PDF', name == 'StrataFit-analisis-2026-10.pdf' and pdf.startswith(b'%PDF-1.4') and pdf.rstrip().endswith(b'%%EOF'), name + ' ' + str(pdf[:12]))
        pages = len(re.findall(rb'/Type /Page\b', pdf))
        check('A4, con sus páginas y el pie en cada una', pages >= 2 and b'/MediaBox [0 0 595.28 841.89]' in pdf and (b'P\xe1gina 1 de %d' % pages) in pdf, str(pages))
        check('con el texto en español (tildes y eñes) y las mismas cifras', 'Análisis mensual de octubre 2026'.encode('cp1252') in pdf and 'Has entrenado 23 veces'.encode('cp1252') in pdf and 'Cumplido'.encode('cp1252') in pdf)
        xref = int(re.findall(rb'startxref\r\n(\d+)', pdf)[-1])
        check('con su tabla de objetos bien hecha', pdf[xref:xref + 4] == b'xref' and all(pdf[int(o):int(o) + 12].split(b' ')[1] == b'0' for o in re.findall(rb'(\d{10}) 00000 n', pdf)))
        ev("sheet()")

        print('Nota de actualización (F-28)')
        ev("A.openSettings()")
        run()
        check('en Ajustes, «Ver nota de actualización»', 'Ver nota de actualización' in txt('#ajs [data-a=openSettingsPage][data-v=nota]'))
        ev("document.querySelector('#ajs [data-a=openSettingsPage][data-v=nota]').click()")
        run()
        sec = ev("[...document.querySelectorAll('.rnp .ups')].map(x=>x.textContent)")
        check('enseña la nota de la última versión, con todos sus cambios', 'Versión ' + ev("APPV") in txt('.rnp') and sec[:1] == ['Novedades'] and ev("document.querySelectorAll('.rnp li').length") >= 10, str(sec))
        lk = ev("(b=>{const s=getComputedStyle(b);return [b.innerText,s.textDecorationLine,parseFloat(s.fontSize),s.color==getComputedStyle(document.querySelector('.rnp small.mu')||b).color,b.getBoundingClientRect().top>document.querySelector('.rnp').getBoundingClientRect().bottom]})(document.querySelector('.rnc .lnk'))")
        check('debajo, «Cerrar» pequeño, gris y subrayado', lk[0] == 'Cerrar' and 'underline' in lk[1] and lk[2] <= 14 and lk[3] and lk[4], str(lk))
        ev("document.querySelector('.rnc .lnk').click()")
        run()
        check('que cierra la nota', ev("!document.querySelector('.rnp') && !!document.querySelector('#ajs .sr[data-a=resetAllAsk]')"))

        print('Copia de seguridad única (F-30, T-14)')
        ev("A.openBackup()")
        run()
        check('la copia va a la nube: una sola, que se sustituye', 'Copia en la nube' in txt('#sh') and 'cada copia nueva sustituye a la anterior' in txt('#sh'))
        name, data = download("document.querySelector('[data-a=backupDownload]').click()")
        check('el archivo se llama siempre igual (StrataFit-copia.json)', name == 'StrataFit-copia.json' and data.startswith(b'{"_sf"'), name)
        name2, _ = download("document.querySelector('[data-a=backupDownload]').click()")
        check('también la vez siguiente: sustituye al anterior en el teléfono', name2 == name)
        check('Ajustes dice cuándo fue la última copia', ev("(A.openSettings(),document.querySelector('#ajs [data-a=openBackup] .srv').innerText)") == 'Hoy')
        ev("A.closeSheet()")

        print('Datos dañados')
        ev("S.wr={n:99,u:'x',t:-1};S.cb={at:'ayer'};S.rp=[{id:'a',k:'z',t:'x'},{id:'prueba-1793782800000',k:'s',a:'',t:'Una sugerencia válida',ca:1793782800000,s:1,st:'p'},5];saveState()")
        pg.reload()
        pg.clock.run_for(1500)
        check('recordatorio, copia y avisos dañados se arreglan al abrir', ev("S.wr===undefined && S.cb===undefined && S.rp.length==1 && S.rp[0].t=='Una sugerencia válida'"), str(ev("[S.wr,S.cb,S.rp]")))

        errs = [e for e in errs if 'favicon' not in e]
        check('sin errores de JS', not errs, str(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1])
