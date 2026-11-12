"""Prueba del guardado por partes (core/persist): formato (núcleo en localStorage, partes en IndexedDB: I-04), paso desde
localStorage (la V1.0.1), datos de la serie de prueba (no se migran), escribir solo lo que cambia y agrupar guardados, partes
que la acción dice haber tocado y repaso de después (I-10), partes dañadas o que faltan (sin guardar ni sincronizar nada
hasta poder leerlas), sin IndexedDB, falta de espacio y su aviso, restaurar y deshacer, borrar todo (sin conexión) y la
pantalla de error.

  python3 tests/storage.py dist/stratafit.html
Requiere:  pip install playwright  &&  playwright install chromium
"""
import os, sys, json, time, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


SEED, EXTRA, INIT = rd('seed.js'), rd('extra.js'), rd('init.js')
fails = []

# Utilidades dentro de la página, independientes del código de la app: claves de localStorage, las partes de IndexedDB (leer,
# escribir y borrar a mano), estado completo guardado (__stored, de tests/init.js), forma canónica (claves ordenadas) para
# comparar, y espía de escrituras (en localStorage y en IndexedDB).
HELPERS = """window.__T={
 keys:p=>{const o=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(p))o.push(k)}return o.sort()},
 idb:(fn,mode,name)=>new Promise((res,rej)=>{const r=indexedDB.open('ffdata',1);r.onerror=()=>rej(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction(name||'parts',mode||'readonly'),q=fn(tx.objectStore(name||'parts'));tx.oncomplete=()=>{db.close();res(q&&q.result)};tx.onerror=()=>{db.close();rej(tx.error)}}}),
 pkeys:()=>__T.idb(st=>st.getAllKeys()).then(k=>k.map(String).sort()),
 get:k=>__T.idb(st=>st.get(k)),
 aside:k=>__T.idb(st=>st.get(k),'readonly','aside'),
 put:(k,v)=>__T.idb(st=>st.put(v,k),'readwrite'),
 del:k=>__T.idb(st=>st.delete(k),'readwrite'),
 stored:()=>savesDone().then(()=>__stored()),
 can:v=>Array.isArray(v)?'['+v.map(__T.can).join(',')+']':v&&typeof v=='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+__T.can(v[k])).join(',')+'}':JSON.stringify(v),
 spy:()=>{window.__w=[];if(!window.__set0){window.__set0=Store.set;window.__del0=Store.del;window.__put0=IDBObjectStore.prototype.put;window.__idel0=IDBObjectStore.prototype.delete}
   Store.set=(k,v,q)=>{__w.push(k);return __set0(k,v,q)};Store.del=(k,q)=>{__w.push('-'+k);return __del0(k,q)};
   IDBObjectStore.prototype.put=function(v,k){if(this.name=='parts')__w.push(k);return __put0.apply(this,arguments)};
   IDBObjectStore.prototype.delete=function(k){if(this.name=='parts')__w.push('-'+k);return __idel0.apply(this,arguments)}},
 unspy:()=>{if(window.__set0){Store.set=__set0;Store.del=__del0;IDBObjectStore.prototype.put=__put0;IDBObjectStore.prototype.delete=__idel0}}
};0"""

# La V1.0.1: el núcleo con _parts 1 y las partes en localStorage (una clave de comidas por mes); IndexedDB, vacía
OLD_LAYOUT = """(s=>__T.idb(st=>st.clear(),'readwrite').then(()=>{
  for(const k of __T.keys('ff'))if(k=='ff'||k.startsWith('ff:'))localStorage.removeItem(k);
  const c=Object.assign({},s,{_parts:1,logs:'ff:logs',hist:'ff:hist',meals:'ff:meals'}),m={};
  for(const d in s.meals)(m[d.slice(0,7)]=m[d.slice(0,7)]||{})[d]=s.meals[d];
  localStorage.setItem('ff:logs',JSON.stringify(s.logs));localStorage.setItem('ff:hist',JSON.stringify(s.hist));
  for(const k in m)localStorage.setItem('ff:meals:'+k,JSON.stringify(m[k]));localStorage.setItem('ff',JSON.stringify(c))}))"""


def booted(pg, limit=8000):
    """Espera (en tiempo real) a que la app haya arrancado del todo tras una recarga: window.__ffok."""
    for _ in range(limit // 50):
        try:
            if pg.evaluate('!!window.__ffok'):
                return True
        except Exception:
            pass
        pg.wait_for_timeout(50)
    return False


def until(pg, js, limit=5000):
    """Espera (en tiempo real) a que js sea verdad en la página."""
    for _ in range(limit // 50):
        try:
            if pg.evaluate(js):
                return True
        except Exception:
            pass
        pg.wait_for_timeout(50)
    return False


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def without_idb(b, path, url):
    """Sin IndexedDB, todo se guarda en localStorage, como antes."""
    c = b.new_context(viewport={'width': 390, 'height': 844}, **context_opts(path))
    c.add_init_script("try{Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true})}catch(e){}")
    c.add_init_script(INIT)
    pg = c.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
    pg.goto(url)
    pg.clock.run_for(800)
    pg.evaluate(SEED)
    pg.evaluate(HELPERS)
    pg.reload()
    pg.clock.run_for(800)
    pg.evaluate(HELPERS)
    core = pg.evaluate("JSON.parse(localStorage.getItem('ff'))")
    check('sin IndexedDB, las partes se quedan en localStorage', core.get('_parts') == 1 and 'ff:logs' in pg.evaluate("__T.keys('ff:')") and '_pk' not in core, str(pg.evaluate("__T.keys('ff:')")))
    n = pg.evaluate('S.logs.length')
    check('y se leen al arrancar', n > 0 and pg.evaluate("__stored().then(s=>s.logs.length)") == n and pg.evaluate('!partsLost'))
    pg.evaluate("S.defaultRest=44;saveState()")
    check('y se sigue guardando', pg.evaluate("JSON.parse(localStorage.getItem('ff')).rest") == 44)
    check('sin errores de JS sin IndexedDB', not errs, '; '.join(errs[:3]))
    c.close()


def main(path):
    url = app_url(path)
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
        c.add_init_script(INIT)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        pg.on('dialog', lambda d: d.accept())
        log = []
        t0 = time.time()
        stamp = lambda: '%.1fs ' % (time.time() - t0)
        pg.on('framenavigated', lambda f: log.append(stamp() + 'navega ' + f.url[-40:]) if f == pg.main_frame else None)
        pg.on('console', lambda m: log.append(stamp() + 'consola ' + m.type + ' ' + m.text[:150]) if m.type in ('error', 'warning') and 'Service Worker registration blocked' not in m.text else None)
        pg.on('crash', lambda *_: log.append(stamp() + 'LA PÁGINA SE HA CERRADO (crash)'))
        pg.on('dialog', lambda d: log.append(stamp() + 'diálogo ' + d.message[:80]))
        try:
            pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
            def ev(js, *a):
                log.append(stamp() + 'evalúa ' + js[:70].replace('\n', ' '))
                return pg.evaluate(js, *a)

            def reload(ms=1500):
                pg.reload()
                pg.wait_for_load_state('load')
                booted(pg)
                pg.clock.run_for(ms)
                ev(HELPERS)

            pg.goto(url)
            pg.clock.run_for(800)
            ev(SEED)
            ev(EXTRA)
            # comidas repartidas en varios meses (y un día de otro año) para probar las claves por mes
            ev("""(()=>{const it=n=>({0:[{n,g:100,b:[100,10,10,1,0,0]}]});
                  Object.assign(S.meals,{'2026-08-14':it('Avena'),'2026-09-02':it('Arroz'),'2026-09-30':it('Pollo'),'2025-12-31':it('Turrón'),[dayKey(new Date())]:it('Yogur')});saveState()})()""")
            reload()

            # ── nombres del programa y claves guardadas (core/schema, I-17) ──
            sch = ev("""(()=>{const T=SCHEMA_TABLES,r={};for(const k of ['state','workout']){const st=T[k].map(x=>x[0]),nm=T[k].map(x=>x[1]);
              r[k]={dupStored:st.length-new Set(st).size,dupName:nm.length-new Set(nm).size,clash:T[k].filter(x=>x[0]!=x[1]&&st.includes(x[1])).map(x=>x[1])}}
              const s=JSON.parse(JSON.stringify(S)),back=stateFromStored(stateToStored(s));
              r.round=JSON.stringify(back)===JSON.stringify(s);r.order=Object.keys(back).join()==Object.keys(s).join();
              r.stored=Object.keys(stateToStored({selectedDay:1,week:2,exerciseHistory:{},zz:3})).join();
              r.unknown=JSON.stringify(stateFromStored({dt:1,sel:2}));
              r.w=JSON.stringify(workoutFromStored(workoutToStored({startedAt:1,restEndsAt:2,sets:[[{r:1}]],zz:1})));
              return r})()""")
            check('cada nombre y cada clave guardada, una sola vez, y ningún nombre es la clave de otra cosa', all(sch[k] == {'dupStored': 0, 'dupName': 0, 'clash': []} for k in ('state', 'workout')), str(sch))
            check('el estado va y vuelve igual, en el mismo orden', sch['round'] and sch['order'])
            check('se guarda con las claves cortas de siempre', sch['stored'] == 'sel,wk,hist,zz', sch['stored'])
            check('una clave que no está en la tabla pasa tal cual', sch['unknown'] == '{"dt":1,"selectedDay":2}', sch['unknown'])
            check('el entreno en curso, igual', sch['w'] == '{"startedAt":1,"restEndsAt":2,"sets":[[{"r":1}]],"zz":1}', sch['w'])
            check('en el móvil, las claves guardadas', ev("(o=>'sel' in o&&'wk' in o&&!('selectedDay' in o))(JSON.parse(localStorage.getItem('ff')))"))

            # «Qué incluye la copia» cuenta lo que hay (con las claves guardadas: core/schema)
            inc = ev("A.openBackup(),[...document.querySelectorAll('#sh details')].find(d=>/Qué incluye/.test(d.textContent)).textContent")
            n_hist = ev("Object.keys(S.exerciseHistory).length")
            check('«Qué incluye la copia» cuenta los entrenos y el historial de cada ejercicio', ('de %d ejercicio' % n_hist) in inc and n_hist > 0 and ('%d entreno' % ev('S.logs.length')) in inc, inc[:200])
            ev("sheet()")

            # ── formato: el núcleo en localStorage; las partes, en IndexedDB (I-04) ──
            core = ev("JSON.parse(localStorage.getItem('ff'))")
            check('el núcleo dice que las partes están en IndexedDB', core.get('_parts') == 2)
            check('las colecciones grandes van aparte', core.get('logs') == 'ff:logs' and core.get('hist') == 'ff:hist' and core.get('meals') == 'ff:meals', str({k: core.get(k) for k in ('logs', 'hist', 'meals')}))
            months = ev("[...new Set(Object.keys(S.meals).map(d=>d.slice(0,7)))].sort().map(m=>'ff:meals:'+m)")
            pk = ev('__T.pkeys()')
            check('una parte de comidas por mes, en IndexedDB', [k for k in pk if k.startswith('ff:meals:')] == months, str(pk))
            check('el núcleo nombra las partes que tiene que haber', core.get('_pk') == pk, str(core.get('_pk')))
            check('y en localStorage no queda ninguna', ev("__T.keys('ff:')") == [], str(ev("__T.keys('ff:')")))
            check('lo guardado es exactamente el estado', ev('__T.stored().then(s=>__T.can(s)===__T.can(stateToStored(S)))'))
            k1 = ev('Object.keys(S)')
            n1 = ev('S.logs.length')
            reload()
            check('al recargar, el estado es el mismo (y en el mismo orden de claves)', ev('Object.keys(S)') == k1 and ev('S.logs.length') == n1 and ev('__T.stored().then(s=>__T.can(s)===__T.can(stateToStored(S)))'))

            # ── la V1.0.1 guardaba las partes en localStorage: al abrir la versión nueva pasan a IndexedDB (I-04) ──
            before = ev('__T.can(stateToStored(S))')
            ev('__T.stored().then(%s)' % OLD_LAYOUT)
            check('(preparado: las partes en localStorage, como en la V1.0.1)', ev("__T.keys('ff:').length") > 3 and ev('__T.pkeys()') == [] and ev("JSON.parse(localStorage.getItem('ff'))._parts") == 1)
            reload()
            core = ev("JSON.parse(localStorage.getItem('ff'))")
            check('las partes pasan de localStorage a IndexedDB, sin perder nada', ev('__T.can(stateToStored(S))') == before and ev('__T.stored().then(s=>__T.can(s))') == before)
            check('el núcleo lo dice (y nombra sus partes)', core.get('_parts') == 2 and core.get('_pk') == ev('__T.pkeys()'), str(core.get('_parts')))
            check('y en localStorage ya no quedan', ev("__T.keys('ff:')") == [], str(ev("__T.keys('ff:')")))
            check('sin avisos de datos dañados', not ev('stateRecovered') and not ev('partsLost') and not ev("!!document.querySelector('#dg .dgc')"))
            pg.clock.run_for(3000)  # lo que hace la app al arrancar (medallas…), antes de contar escrituras

            # ── escribir solo lo que cambia y agrupar los guardados de una acción ──
            ev("__T.spy();S.water[dayKey(new Date())]=750;saveState();saveState();saveState()")
            check('un cambio de ajustes escribe solo el núcleo, una vez', ev('savesDone().then(()=>__w)') == ['ff'], str(ev('__w')))
            ev("__w.length=0;S.meals['2026-09-02'][1]=[{n:'Kiwi',g:80,b:[61,15,1,.5,3,0]}];saveState()")
            check('una comida escribe solo su mes', ev('savesDone().then(()=>__w)') == ['ff:meals:2026-09'], str(ev('__w')))
            ev("__w.length=0;S.logs.push({d:dayKey(new Date()),n:'Extra',v:100,s:3,m:20,q:7});saveState()")
            check('un entreno escribe solo los entrenos', ev('savesDone().then(()=>__w)') == ['ff:logs'], str(ev('__w')))
            ev("__w.length=0;saveState()")
            check('sin cambios no escribe nada', ev('savesDone().then(()=>__w)') == [], str(ev('__w')))
            ev("__w.length=0;delete S.meals['2026-08-14'];saveState()")
            check('un mes que se queda sin comidas se borra, después de quitarlo del núcleo', ev('savesDone().then(()=>__w)') == ['ff', '-ff:meals:2026-08'] and 'ff:meals:2026-08' not in ev('__T.pkeys()') and 'ff:meals:2026-08' not in ev("JSON.parse(localStorage.getItem('ff'))._pk"), str(ev('__w')))
            ev("__w.length=0;S.meals['2026-11-02']={0:[{n:'Pera',g:120,b:[57,15,.4,.1,3,0]}]};saveState()")
            check('un mes nuevo se guarda antes de nombrarlo en el núcleo', ev('savesDone().then(()=>__w)') == ['ff:meals:2026-11', 'ff'], str(ev('__w')))
            ev("__w.length=0;Store.remote={changed:(k,v)=>__w.push('remoto '+k)};S.meals['2026-09-30'][0][0].g=120;saveState()")
            check('el adaptador remoto recibe la parte cambiada', 'remoto ff:meals:2026-09' in ev('savesDone().then(()=>__w)'), str(ev('__w')))
            ev("Store.remote=null")

            # ── la acción dice qué partes ha tocado: solo esas se pasan a texto; las demás, en el repaso de después (I-10) ──
            ev("__w.length=0;window.__js0=JSON.stringify;window.__big=0;JSON.stringify=function(v){if(v===S.logs||v===S.exerciseHistory)__big++;return __js0.apply(this,arguments)}")
            ev("S.meals['2026-09-02'][1][0].g=95;S.logs[0].v+=1;saveState(mealsPart('2026-09-02'))")
            check('con saveState(mealsPart(día)) se escribe solo ese mes', ev('savesDone().then(()=>__w)') == ['ff:meals:2026-09'], str(ev('__w')))
            check('sin pasar a texto las partes grandes', ev('__big') == 0, str(ev('__big')))
            pg.clock.run_for(2500)
            check('lo que tocó sin decirlo se guarda en el repaso, poco después', ev('savesDone().then(()=>__w)') == ['ff:meals:2026-09', 'ff:logs'] and ev("__T.stored().then(s=>s.logs[0].v===S.logs[0].v)"), str(ev('__w')))
            ev("__w.length=0;__big=0;S.water[dayKey(new Date())]=900;saveState('core')")
            check("con saveState('core') solo el núcleo, y sin pasar a texto las partes", ev('savesDone().then(()=>__w)') == ['ff'] and ev('__big') == 0, str((ev('__w'), ev('__big'))))
            ev("__w.length=0;S.logs[0].v+=1;saveState('core');saveState()")
            check('si otra llamada de la misma acción no dice nada, se mira todo', ev('savesDone().then(()=>__w)') == ['ff:logs'], str(ev('__w')))
            ev("__w.length=0;S.logs[0].v+=1;saveState('core')")
            ev("Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));delete document.visibilityState")
            check('al salir de la app, el repaso se hace ya', ev('savesDone().then(()=>__w)') == ['ff:logs'], str(ev('__w')))
            ev("JSON.stringify=__js0;__T.unspy()")
            pg.clock.run_for(2500)

            # ── datos de la serie de prueba (1.20 y anteriores: todo el estado en 'ff'): no se migran ──
            legacy = ev("JSON.stringify(Object.assign({},S,{rest:61}))")
            ev("(s=>__T.idb(st=>st.clear(),'readwrite').then(()=>{localStorage.clear();localStorage.setItem('ff',s)}))(%s)" % json.dumps(legacy))
            reload()
            check('el estado entero en «ff» (serie de prueba) no se lee: no se migra', ev('S.defaultRest') != 61 and ev('S.logs.length') == 0 and not ev('stateRecovered'))
            ev("saveState()")
            check('y se sustituye por el guardado por partes', ev("savesDone().then(()=>JSON.parse(localStorage.getItem('ff'))._parts)") == 2)
            ev(SEED)
            ev(EXTRA)
            reload()

            # ── partes dañadas ──
            nlogs = ev('S.logs.length')
            ev("__T.put('ff:hist','{roto').then(()=>localStorage.removeItem('ffbad'))")
            reload()
            check('con una parte dañada arranca', ev('!!window.__ffok&&stateRecovered==2&&!partsLost'))
            check('vacía solo esa parte', ev('Object.keys(S.exerciseHistory).length') == 0 and ev('S.logs.length') == nlogs)
            bad = ev("JSON.parse(localStorage.getItem('ffbad')||'null')")
            check('y la aparta para poder recuperarla', bool(bad) and bad.get('raw') == '{roto' and bad.get('k') == 'ff:hist', str(bad)[:120])
            check('avisa de que falta una parte', ev("/No se pudo leer una parte de tus datos/.test(document.body.innerText)"))
            ev("document.querySelector('#dg').innerHTML='';S.defaultRest=78;saveState()")
            check('el siguiente guardado la repara', ev("savesDone().then(()=>__T.get('ff:hist'))") == '{}')

            # ── una parte que falta en IndexedDB: no se guarda ni se sincroniza nada hasta poder leerla ──
            logs_text = ev("__T.get('ff:logs')")
            core_text = ev("localStorage.getItem('ff')")
            ev("__T.del('ff:logs')")
            reload()
            check('si falta una parte, avisa de que no se pudieron leer los datos', ev('partsLost') == 1 and ev("/No se pudieron leer tus datos/.test(document.querySelector('#dg').innerText)"), ev("document.body.innerText.slice(0,200)"))
            check('con «Reintentar» y «Bajar de mi cuenta»', ev("!!document.querySelector('#dg [data-v=partsRetry]')&&!!document.querySelector('#dg [data-v=partsFromCloudAsk]')"))
            ev("S.defaultRest=81;S.logs=[];saveState()")
            pg.clock.run_for(3000)
            check('mientras, no se guarda nada (lo de antes queda intacto)', ev("savesDone().then(()=>localStorage.getItem('ff'))") == core_text and ev("__T.get('ff:logs')") is None)
            check('ni empieza a sincronizar', ev("syncState().st") in ('', 'idle', None) and ev("!Store.remote"), str(ev("syncState().st")))
            ev("__T.put('ff:logs',%s)" % json.dumps(logs_text))
            # (la acción del botón, sin cerrar el aviso con el historial: esa navegación de la misma página confundiría a la espera)
            with pg.expect_navigation():
                ev("A.partsRetry()")
            pg.wait_for_load_state('load')
            booted(pg)
            pg.clock.run_for(1500)
            ev(HELPERS)
            check('con la parte de vuelta, «Reintentar» arranca con todo', not ev('partsLost') and ev('S.logs.length') == nlogs and ev("!document.querySelector('#dg .dgc')"))

            # ── restaurar una copia con un guardado pendiente en la misma acción ──
            ev("for(let i=0;i<5;i++)S.logs.push({d:'2026-10-0'+(i+1),n:'Día '+i,v:1000,s:10,m:40,q:7});S.exerciseHistory={'Press banca':[{d:'2026-10-01',s:[[5,80,8,0]]}]};saveState()")
            # (sin los id de los entrenos: el arranque se los pone a los que no tienen, core/repair)
            before = ev('(()=>{const s=JSON.parse(JSON.stringify(stateToStored(S)));s.logs.forEach(l=>delete l.id);return __T.can(s)})()')
            ev("(()=>{const s=JSON.parse(JSON.stringify(stateToStored(S)));s.logs=s.logs.slice(0,2);s.meals={'2025-01-01':{0:[{n:'Copia',g:1,b:[1,1,1,1,0,0]}]}};s.rest=31;window.__bk=s})()")
            with pg.expect_navigation():
                ev("S.defaultRest=999;saveState();pendingRestore={s:__bk};restoreBackup()")
            pg.wait_for_load_state('load')
            booted(pg)
            pg.clock.run_for(1500)
            ev(HELPERS)
            check('restaurar no lo pisa un guardado pendiente', ev('S.defaultRest') == 31 and ev('S.logs.length') == 2, str((ev('S.defaultRest'), ev('S.logs.length'))))
            check('y deja solo los meses de la copia', [k for k in ev('__T.pkeys()') if k.startswith('ff:meals:')] == ['ff:meals:2025-01'], str(ev('__T.pkeys()')))
            pre = ev("JSON.parse(localStorage.getItem('ffpre'))")
            pre_copy = json.loads(ev("__T.aside('pre')") or 'null') or {}
            check('la copia de antes de restaurar va aparte, en IndexedDB (en localStorage, solo su fecha)', pre.get('a') == 1 and 's' not in pre and pre_copy.get('t') == pre.get('t') and (pre_copy.get('s') or {}).get('rest') == 999, str(pre)[:100])
            with pg.expect_navigation():
                ev('A.backupUndo()')
            pg.wait_for_load_state('load')
            booted(pg)
            pg.clock.run_for(1500)
            ev(HELPERS)
            check('deshacer la restauración devuelve los datos anteriores', ev('S.defaultRest') == 999 and ev('(()=>{const s=JSON.parse(JSON.stringify(stateToStored(S)));s.rest=%s;s.logs.forEach(l=>delete l.id);return __T.can(s)})()' % json.dumps(json.loads(before)['rest'])) == before)
            ev("document.querySelector('#dg')&&(document.querySelector('#dg').innerHTML='')")
            # una copia previa de la V1.0.1 (entera en localStorage) se sigue pudiendo deshacer
            ev("localStorage.setItem('ffpre',JSON.stringify({t:Date.now(),v:'1.0.1',s:Object.assign(JSON.parse(JSON.stringify(stateToStored(S))),{rest:57}),w:null}))")
            ev("A.backupUndoAsk()")
            check('una copia previa de la V1.0.1 se sigue pudiendo deshacer', ev("!!document.querySelector('#dg [data-v=backupUndo]')"))
            with pg.expect_navigation():
                ev("A.backupUndo()")
            pg.wait_for_load_state('load')
            booted(pg)
            pg.clock.run_for(1500)
            ev(HELPERS)
            check('y vuelve a ella', ev('S.defaultRest') == 57)
            ev("document.querySelector('#dg')&&(document.querySelector('#dg').innerHTML='')")

            # ── restaurar sin espacio: no cambia nada y se sigue guardando con normalidad ──
            before = ev('__T.stored().then(s=>__T.can(s))')
            ev("window.__put2=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,k){if(k=='ff:hist'){const e=new Error('lleno');e.name='QuotaExceededError';throw e}return __put2.apply(this,arguments)};0")
            ev("(()=>{const s=JSON.parse(JSON.stringify(stateToStored(S)));s.hist={'Sentadilla':[{d:'2026-10-02',s:[[5,100,8,0]]}]};s.logs=[];pendingRestore={s};return restoreBackup()})()")
            pg.clock.run_for(300)
            check('si la copia no cabe, avisa', ev("/No se pudo restaurar; tus datos siguen como estaban/.test(document.body.innerText)"))
            check('y los datos guardados siguen como estaban', ev('__T.stored().then(s=>__T.can(s))') == before)
            ev("IDBObjectStore.prototype.put=__put2;S.defaultRest=32;saveState()")
            check('después sigue guardando', ev("savesDone().then(()=>JSON.parse(localStorage.getItem('ff')).rest)") == 32 and ev('__T.stored().then(s=>__T.can(s)===__T.can(stateToStored(S)))'))
            pg.clock.run_for(6000)

            # ── aviso de espacio (I-04): pasado el 80 %, una vez por semana, cuando la app esté libre ──
            # (con la app libre: sin hojas, avisos ni el recorrido, que sale tras empezar de cero con los datos de la serie de prueba)
            ev("sheet();document.querySelector('#dg').innerHTML='';document.querySelector('#tour')&&document.querySelector('#tour').remove();localStorage.removeItem('ffspace');window.__est=navigator.storage.estimate;navigator.storage.estimate=()=>Promise.resolve({usage:85e6,quota:100e6})")
            ev('spaceCheck()')
            check('con el 85 % usado, avisa', ev("/Queda poco espacio/.test(document.querySelector('#dg').innerText)&&/85 %/.test(document.querySelector('#dg').innerText)"), ev("document.querySelector('#dg').innerText.slice(0,120)"))
            check('con «Copia de seguridad» a mano', ev("!!document.querySelector('#dg [data-v=openBackup]')"))
            ev("document.querySelector('#dg').innerHTML='';spaceCheck()")
            check('y no vuelve a avisar hasta dentro de una semana', ev("!document.querySelector('#dg .dgc')"))
            ev("localStorage.removeItem('ffspace');window.__tr=document.createElement('div');__tr.id='tour';document.body.appendChild(__tr);spaceCheck()")
            check('con algo delante (el recorrido), espera', ev("!document.querySelector('#dg .dgc')"))
            ev("__tr.remove()")
            # (lo que la app abra sola mientras tanto, como el aviso de pesarse, también la ocupa: se cierra y se espera otra vez)
            busy = "[window.W&&'entreno',document.visibilityState=='hidden'&&'oculta',...['#lgw','#wlc','#tour','#upd','#f2w'].filter(x=>document.querySelector(x)),document.querySelector('#sh').firstChild&&'hoja',document.querySelector('#dg').firstChild&&'aviso',document.querySelector('#mn').firstChild&&'menú'].filter(Boolean)"
            seen = []
            for _ in range(3):
                pg.clock.run_for(31000)
                if until(pg, "!!document.querySelector('#dg [data-v=openBackup]')", 1500):
                    break
                seen.append(ev(busy))
                ev("sheet();document.querySelector('#dg').innerHTML='';document.querySelector('#tour')&&document.querySelector('#tour').remove()")
            check('y avisa en cuanto la app queda libre', ev("!!document.querySelector('#dg [data-v=openBackup]')"), str(seen))
            ev("document.querySelector('#dg').innerHTML=''")
            ev("localStorage.removeItem('ffspace');navigator.storage.estimate=()=>Promise.resolve({usage:50e6,quota:100e6})")
            ev('spaceCheck()')
            check('con la mitad usada, no avisa', ev("!document.querySelector('#dg .dgc')"))
            ev("A.openDiagnostics()")
            check('Diagnóstico dice dónde están las partes y el espacio usado', until(pg, "/Espacio usado: localStorage .*IndexedDB y caché .* \\(50 %\\)/.test(document.getElementById('diagt').value)") and '(IndexedDB)' in ev("document.getElementById('diagt').value"), ev("document.getElementById('diagt').value.split('\\n').filter(l=>/Espacio|Almacenamiento/.test(l)).join(' | ')")[:300])
            ev("navigator.storage.estimate=__est;sheet()")

            # ── pantalla de error de arranque ──
            n = ev('S.logs.length')
            ev("window.__ffe('fallo simulado')")
            ev("document.getElementById('ffe2').click()")
            until(pg, "document.getElementById('ffe4').value.length>0")
            shown = json.loads(ev("document.getElementById('ffe4').value"))
            check('«Ver mis datos» enseña el estado completo (también lo de IndexedDB)', isinstance(shown.get('logs'), list) and len(shown['logs']) == n and '2026-10-29' in shown.get('meals', {}) and '_parts' not in shown and '_pk' not in shown, str(shown)[:120])
            ev("localStorage.setItem('ffsync',JSON.stringify({dev:'d1',base:{'logs:2026':{r:1,h:'x'}},lt:{}}))")
            with pg.expect_navigation():
                pg.click('#ffe3')
            pg.wait_for_load_state('load')
            booted(pg)
            pg.clock.run_for(800)
            ev(HELPERS)
            bad = json.loads(ev("JSON.parse(localStorage.getItem('ffbad')).raw"))
            check('«Restablecer» aparta el estado completo antes de borrarlo', len(bad.get('logs', [])) == n and 'Press banca' in bad.get('hist', {}))
            check('y empieza de cero', ev("__T.keys('ff:')") == [] and ev('S.logs.length') == 0 and ev("savesDone().then(()=>__T.get('ff:logs'))") in (None, '[]'), str(ev('__T.pkeys()')))
            check('y olvida la sincronización: lo de la cuenta se vuelve a bajar en vez de borrarlo en la nube', ev("!localStorage.getItem('ffsync')||!('logs:2026' in JSON.parse(localStorage.getItem('ffsync')).base)"))

            # ── borrar todos los datos: también se borran de la cuenta, así que sin conexión no se borra nada (lo demás, en
            #    tests/cloud.py) ──
            ev(SEED)
            n = ev('S.logs.length')
            ev("A.resetAllConfirmed()")
            pg.clock.run_for(500)
            check('«Borrar todo» sin conexión no borra nada y lo explica', ev('S.logs.length') == n and 'ff:logs' in ev("savesDone().then(()=>__T.pkeys())") and 'hace falta internet' in ev("document.body.innerText"))
            check('sin errores de JS', not errs, '; '.join(errs[:3]))
        except Exception:
            print('  FALLA excepción; últimos sucesos de la página:', ' | '.join(log[-14:]))
            raise
        without_idb(b, path, url)
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
