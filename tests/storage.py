"""Prueba del guardado por partes (core/persist): formato (núcleo en localStorage, partes en IndexedDB: I-04), paso desde
localStorage (la V1.0.1), datos de la serie de prueba (no se migran), escribir solo lo que cambia y agrupar guardados, partes
que la acción dice haber tocado y repaso de después (I-10), partes dañadas o que faltan (sin guardar ni sincronizar nada
hasta poder leerlas), sin IndexedDB, falta de espacio y su aviso, restaurar y deshacer, borrar todo (sin conexión), la
pantalla de error y la app abierta dos veces (solo guarda una cada vez).

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
# comparar, y espía de escrituras (en localStorage y en IndexedDB): en __w, las de los datos; en __wa, todas, también la marca
# que deja cada guardado (ffrev: core/persist, «una sola apertura de la app guarda cada vez»).
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
 spy:()=>{window.__w=[];window.__wa=[];if(!window.__set0){window.__set0=Store.set;window.__del0=Store.del;window.__put0=IDBObjectStore.prototype.put;window.__idel0=IDBObjectStore.prototype.delete}
   const note=k=>{__wa.push(k);if(k!='ffrev')__w.push(k)};
   Store.set=(k,v,q)=>{note(k);return __set0(k,v,q)};Store.del=(k,q)=>{note('-'+k);return __del0(k,q)};
   IDBObjectStore.prototype.put=function(v,k){if(this.name=='parts')note(k);return __put0.apply(this,arguments)};
   IDBObjectStore.prototype.delete=function(k){if(this.name=='parts')note('-'+k);return __idel0.apply(this,arguments)}},
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


def reload_by(pg, js, limit=10000):
    """Hace js, que recarga la app, y espera a que la página nueva haya arrancado. No vale pg.expect_navigation: también se
    cumple con la navegación del historial de la misma página (la de «atrás» al cerrar un aviso, core/back), y la recarga de
    verdad llegaría después, a mitad de la prueba siguiente."""
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


def two_windows(b, path, url):
    """La app abierta dos veces sobre lo mismo guardado (dos pestañas o ventanas): guarda una sola cada vez. La que se queda
    atrás no escribe nada (ni el estado ni el entreno en curso) y se recarga con lo último (core/persist: instanceStale;
    core/boot). Lo de la nube, en tests/cloud.py."""
    c = b.new_context(viewport={'width': 390, 'height': 844}, **context_opts(path))
    c.add_init_script(INIT)
    errs = []

    def window():
        pg = c.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(url)
        booted(pg)
        return pg

    day = [0]

    def log(n):
        day[0] += 1
        return "S.logs.push({d:'2026-10-%02d',n:'%s',v:4000,s:16,m:55,q:7});saveState('logs')" % (day[0], n)

    names = "S.logs.map(l=>l.n).join()"
    stored = "savesDone().then(()=>__stored()).then(s=>s.logs.map(l=>l.n).join())"
    notice = "/abierta en otra ventana/.test(document.querySelector('#dg').innerText)"
    no_notice = "!document.querySelector('#dg').firstChild"
    stale = lambda pg: pg.evaluate('instanceStale')

    a = window()
    a.evaluate("S.logs=[];S.defaultRest=150;" + log('Pecho'))
    a.reload()
    booted(a)
    # (lo que la app guarda sola al arrancar con datos nuevos: los logros, la primera vez, unos 2,5 s después. Que quede hecho)
    until(a, '!!S.achievements', 8000)
    rev = a.evaluate("savesDone().then(()=>localStorage.getItem('ffrev'))")
    check('cada guardado deja su marca', bool(rev) and a.evaluate("S.defaultRest=151;flushState().then(()=>localStorage.getItem('ffrev'))") != rev, str(rev))
    q = window()
    # (lo que cada una hace sola al arrancar: la primera sincronización, sin conexión, a los 1,5 s, y mirar los logros, a los 2,5 s)
    q.wait_for_timeout(3200)
    check('abrir la app otra vez no deja atrás a la que ya estaba: arrancar no guarda nada', not stale(a) and not stale(q) and q.evaluate(names) == 'Pecho' and a.evaluate(no_notice), str([stale(a), stale(q), q.evaluate(names), a.evaluate("document.querySelector('#dg').innerText")[:150]]))

    # ── una guarda: la otra se queda atrás, lo dice y deja de sincronizar ──
    a.evaluate(log('Pierna'))
    check('si otra ventana guarda, esta se queda atrás', until(q, 'instanceStale'))
    check('y lo dice, con «Recargar»', q.evaluate(notice) and q.evaluate("document.querySelector('#dg [data-v=staleReload]').textContent") == 'Recargar', q.evaluate("document.querySelector('#dg').innerText")[:120])
    check('y deja de sincronizar', q.evaluate('!Store.remote'))
    check('la que guardó sigue como estaba', not stale(a) and a.evaluate(no_notice) and a.evaluate(stored) == 'Pecho,Pierna')
    # lo que intente guardar la que se quedó atrás no se escribe (pisaría lo de la otra), y el aviso sigue puesto
    saved = q.evaluate("(S.logs=[],S.defaultRest=99,flushState())")
    q.wait_for_timeout(300)
    check('la que se quedó atrás no escribe nada, aunque algo intente guardar', saved is False and q.evaluate(stored) == 'Pecho,Pierna' and q.evaluate("JSON.parse(localStorage.getItem('ff')).rest") == 151 and q.evaluate(notice), str(saved))
    a.evaluate(log('Hombro'))
    # (antes de recargar una ventana, la otra termina de guardar: una que arranca con un guardado de la otra a medias lee la
    # marca del principio de ese guardado y, al ver la del final, se da por atrasada aunque tenga lo último. Es lo previsto,
    # porque así no se queda con el núcleo de antes y las partes de después, pero aquí no es lo que se prueba. En un ordenador
    # lento pasaba: en GitHub, con Firefox)
    a.evaluate('savesDone()')
    ok = reload_by(q, "document.querySelector('#dg [data-v=staleReload]').click()")
    check('«Recargar» la recarga con lo último, y vuelve a poder guardar', ok and q.evaluate(names) == 'Pecho,Pierna,Hombro' and q.evaluate('S.defaultRest') == 151 and not stale(q) and q.evaluate(no_notice), '%s %s' % (ok, q.evaluate(names)))

    # ── ahora guarda la otra: la primera es la que se queda atrás. El aviso solo se quita recargando ──
    q.evaluate(log('Espalda'))
    check('la última que guarda es la que vale: ahora se queda atrás la otra', until(a, 'instanceStale') and a.evaluate(notice) and not stale(q) and q.evaluate(stored) == 'Pecho,Pierna,Hombro,Espalda')
    ok = reload_by(a, "document.querySelector('#dg').innerHTML=''")
    check('si el aviso se cierra de otra forma (el gesto de volver), se recarga igual', ok and a.evaluate(names) == 'Pecho,Pierna,Hombro,Espalda' and not stale(a))

    # ── sin estar a la vista, no hay aviso: se recarga sola al volver a ella ──
    q.evaluate("window.__mark=1;Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});0")
    a.evaluate(log('Gemelo'))
    until(q, 'instanceStale')
    a.evaluate('savesDone()')
    q.wait_for_timeout(300)
    check('la que no se está viendo se queda atrás sin aviso y sin recargarse todavía', stale(q) == 1 and q.evaluate(no_notice) and q.evaluate('window.__mark') == 1)
    ok = reload_by(q, "delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))")
    check('y se recarga sola, con lo último, al volver a ella', ok and q.evaluate(names) == 'Pecho,Pierna,Hombro,Espalda,Gemelo' and not stale(q) and q.evaluate(no_notice))
    q.close()

    # ── una ventana que el navegador tenía parada no se entera cuando la otra guarda (aquí, la marca cambiada a mano): lo ve al
    #    volver a ella, o al ir a guardar ──
    a.evaluate("localStorage.setItem('ffrev','otra')")
    check('(preparado: otra ha guardado y esta no se ha enterado)', not stale(a))
    ok = reload_by(a, "document.dispatchEvent(new Event('visibilitychange'))")
    check('al volver a una ventana que se quedó atrás sin enterarse, se recarga sola', ok and not stale(a) and a.evaluate(no_notice))
    a.evaluate(log('Core'))
    check('y, recargada, guarda con normalidad', a.evaluate(stored) == 'Pecho,Pierna,Hombro,Espalda,Gemelo,Core' and not stale(a))
    a.evaluate("localStorage.setItem('ffrev','otra')")
    a.evaluate("S.defaultRest=77;saveState()")
    check('y si va a guardar sin haberse enterado, no guarda y lo dice', until(a, 'instanceStale') and a.evaluate(notice) and a.evaluate("savesDone().then(()=>JSON.parse(localStorage.getItem('ff')).rest)") == 151)
    reload_by(a, "document.querySelector('#dg [data-v=staleReload]').click()")

    # ── el entreno en curso lo lleva una sola: quien lo empieza o lo reanuda ──
    q = window()
    a.evaluate("S.selectedDay=S.plan.findIndex(d=>d.ex.length);A.startWorkout();W.sets[0][0].w=50;R()")
    wip = "(z=>z&&z.W?(z.W.x||[[{}]])[0][0].w:null)(JSON.parse(localStorage.getItem('ffw')||'null'))"
    check('al empezar un entreno, queda guardado para reanudarlo', a.evaluate(wip) == 50, str(a.evaluate("localStorage.getItem('ffw')"))[:200])
    check('quien empieza un entreno se queda con lo guardado: la otra ventana se queda atrás', until(q, 'instanceStale') and not stale(a))
    q.evaluate("R()")
    check('y una ventana sin entreno no borra el entreno en curso de la otra', q.evaluate(wip) == 50)
    a.evaluate('savesDone()')
    reload_by(q, "document.querySelector('#dg [data-v=staleReload]').click()")
    check('la otra ventana, recargada, ofrece reanudarlo', q.evaluate("(S.tab=0,R(),!!document.querySelector('#app [data-a=resumeWorkout]'))") and not stale(a))
    q.evaluate("A.resumeWorkout();W.sets[0][0].w=60;R()")
    check('si se reanuda en la otra, pasa a llevarlo ella', until(a, 'instanceStale') and not stale(q) and q.evaluate(wip) == 60)
    a.evaluate("W.sets[0][0].w=1;R()")
    check('y la que se quedó atrás ya no pisa el entreno en curso', a.evaluate(wip) == 60)
    q.evaluate('savesDone()')
    reload_by(a, "document.querySelector('#dg [data-v=staleReload]').click()")
    q.evaluate("W=null;R()")
    check('al acabar el entreno, quien lo llevaba lo borra', q.evaluate("!localStorage.getItem('ffw')"))
    # un entreno en curso que no escribió esta ventana (el de otra que aún no ha guardado nada más) no se borra al pintar
    q.evaluate("localStorage.setItem('ffw','{\"de\":\"otra\"}');R()")
    check('una ventana no borra un entreno en curso que no es suyo', q.evaluate("localStorage.getItem('ffw')") == '{"de":"otra"}')
    q.evaluate("localStorage.removeItem('ffw')")
    check('sin errores de JS con la app abierta dos veces', not errs, '; '.join(errs[:3]))
    c.close()


def after_reload(b, path, url):
    """Una recarga no es otra ventana. Al recargar, la página anterior de la pestaña sigue viva un momento: lo que guarda al
    cerrarse puede terminar con la nueva ya abierta, y el aviso de lo que guardó justo antes puede llegarle tarde a la nueva.
    Antes, una de cada varias decenas de recargas enseñaba «La app está abierta en otra ventana» con una sola abierta. Ahora un
    aviso de lo que la página ya tiene no cuenta, y si quien ha guardado después es la página anterior de la misma pestaña, la
    nueva se recarga sola, sin aviso (core/persist: coreAtLoad, savedByPredecessor; core/boot)."""
    c = b.new_context(viewport={'width': 390, 'height': 844}, **context_opts(path))
    c.add_init_script(INIT)
    # (el núcleo que hay guardado cuando la página empieza a cargar: el que la app lee al arrancar)
    c.add_init_script("try{window.__core0=localStorage.getItem('ff')}catch(e){}")
    # (y cuántas veces se ha cargado la app en la pestaña)
    c.add_init_script("try{sessionStorage.setItem('__loads',String(1+(+sessionStorage.getItem('__loads')||0)))}catch(e){}")
    errs = []
    a = c.new_page()
    a.on('pageerror', lambda e: errs.append(str(e)[:200]))
    a.goto(url)
    booted(a)
    notice = "/abierta en otra ventana/.test(document.querySelector('#dg').innerText)"
    no_notice = "!document.querySelector('#dg').firstChild"
    stale = lambda: a.evaluate('instanceStale')
    told = "(k, v) => window.dispatchEvent(new StorageEvent('storage', { key: k, newValue: v, storageArea: localStorage }))"
    a.evaluate("S.logs=[];S.defaultRest=150;saveState()")
    a.reload()
    booted(a)
    until(a, '!!S.achievements', 8000)
    a.evaluate('savesDone()')

    # ── el aviso de algo que la página ya tiene ──
    at_load = a.evaluate("window.__core0")
    a.evaluate("v => (%s)('ff', v)" % told, at_load)
    a.wait_for_timeout(200)
    check('un aviso que llega tarde, de lo que la página leyó al arrancar, no la deja atrás', bool(at_load) and not stale() and a.evaluate(no_notice))
    a.evaluate("S.defaultRest=151;flushState()")
    now = a.evaluate("savesDone().then(()=>localStorage.getItem('ff'))")
    a.evaluate("([x, y]) => { (%s)('ff', x); (%s)('ff', y); }" % (told, told), [at_load, now])
    a.wait_for_timeout(200)
    check('ni después de haber guardado ella: ni el de lo que leyó ni el de lo que acaba de dejar', at_load != now and not stale() and a.evaluate(no_notice), str([at_load != now, stale()]))
    a.evaluate("S.defaultRest=152;flushState()")
    check('y sigue guardando', a.evaluate("savesDone().then(()=>JSON.parse(localStorage.getItem('ff')).rest)") == 152 and not stale())
    a.evaluate("(%s)('ff', '{\"tab\":2}')" % told)
    check('otro contenido sí la deja atrás, con su aviso (una versión anterior de la app, que no deja marca, en otra ventana)', until(a, 'instanceStale') and a.evaluate(notice))
    reload_by(a, "document.querySelector('#dg [data-v=staleReload]').click()")

    # ── quien ha guardado después es la página anterior de esta pestaña ──
    a.evaluate("sessionStorage.setItem('ffbye','anterior');localStorage.setItem('ffrev','anterior.ultimo')")
    ok = reload_by(a, "(%s)('ffrev', 'anterior.ultimo')" % told)
    check('si la que guarda después es la página anterior de la pestaña (lo deja dicho al cerrarse), la nueva se recarga sola, sin aviso',
          ok and not stale() and a.evaluate(no_notice) and a.evaluate("sessionStorage.getItem('ffbye')") is None, '%s %s' % (ok, stale()))
    a.evaluate("sessionStorage.setItem('ffbye','anterior');localStorage.setItem('ffrev','otra.marca');(%s)('ffrev', 'otra.marca')" % told)
    check('si es otra (su marca no es de la anterior), es otra ventana: sale el aviso', until(a, 'instanceStale') and a.evaluate(notice) and a.evaluate('window.__ffok'))
    reload_by(a, "document.querySelector('#dg [data-v=staleReload]').click()")
    a.evaluate("localStorage.setItem('ffrev','otra.marca2');(%s)('ffrev', 'otra.marca2')" % told)
    check('y lo que dejó dicho la anterior vale una vez: después, el aviso de siempre', until(a, 'instanceStale') and a.evaluate(notice))
    reload_by(a, "document.querySelector('#dg [data-v=staleReload]').click()")
    a.evaluate("S.defaultRest=160;flushState()")
    check('cada apertura deja su marca con su nombre delante y, al cerrarse, dice en la pestaña quién era',
          a.evaluate("savesDone().then(() => (window.dispatchEvent(new Event('pagehide')), (b => !!b && localStorage.getItem('ffrev').startsWith(b + '.'))(sessionStorage.getItem('ffbye'))))"),
          str(a.evaluate("[sessionStorage.getItem('ffbye'), localStorage.getItem('ffrev')]")))

    # ── y de verdad: recargar con el repaso pendiente y algo que guardar en él, muchas veces ──
    # Un guardado de una parte deja pendiente el repaso completo (a los 2 s, o al cerrarse la página). Si para entonces ha
    # cambiado algo más sin decirlo, lo guarda el repaso. En las vueltas pares cambia el núcleo (el descanso por defecto): se
    # escribe al momento, al cerrarse, y a la página nueva solo le llega tarde el aviso. En las impares cambia una parte (un
    # entreno del registro): va a IndexedDB y puede terminar con la página nueva ya abierta, que entonces se recarga sola, o
    # no llegar a escribirse si el navegador cierra antes la página (eso no lo puede evitar la app).
    a.evaluate("S.logs=[];S.defaultRest=199;flushState()")
    a.evaluate('savesDone()')
    seen, bad, loads0 = 0, [], a.evaluate("+sessionStorage.getItem('__loads')")
    for i in range(14):
        # (el primer guardado de una página lo mira todo; el segundo, solo la parte que dice, y deja pendiente el repaso)
        a.evaluate("S.logs.push({d:'2026-10-%02d',n:'R%d',v:1000,s:4,m:20,q:7});flushState().then(()=>{S.logs[S.logs.length-1].m=21;saveState('logs');return savesDone()})" % (i + 1, i))
        change = "S.defaultRest=%d" % (200 + i) if i % 2 == 0 else "S.logs[S.logs.length-1].v=%d" % (2000 + i)
        reload_by(a, change + ";location.reload()")
        st = [False]
        for _ in range(80):
            # (si la anterior terminó de guardar con esta ya abierta, esta se recarga sola: se espera a que quede quieta)
            try:
                st = a.evaluate("[!!window.__ffok, instanceStale, !!document.querySelector('#dg').firstChild, !!partsLost, S.defaultRest, S.logs.length, (S.logs[S.logs.length-1]||{}).v]")
            except Exception:
                st = [False]
            if st[0] and st[2]:
                seen += 1
                break
            if st[0] and not st[1]:
                a.wait_for_timeout(250)   # (un aviso tardío llegaría en este rato)
                try:
                    if a.evaluate("!!window.__ffok && !instanceStale && !document.querySelector('#dg').firstChild"):
                        break
                except Exception:
                    pass
            a.wait_for_timeout(50)
        rest = 200 + i - i % 2
        if not (st[0] and len(st) > 6 and not st[1] and not st[3] and st[4] == rest and st[5] == i + 1 and st[6] in (1000, 2000 + i)):
            bad.append([i] + st)
    extra = a.evaluate("+sessionStorage.getItem('__loads')") - loads0 - 14
    print('        (de 14 recargas, la página nueva se recargó sola %d veces)' % extra)
    check('recargar con el repaso pendiente, 14 veces: nunca sale el aviso de otra ventana', seen == 0, '%d veces' % seen)
    check('y la página queda al día y sin nada roto: lo que se guardó al cerrarse está, y lo de IndexedDB, entero o como estaba', not bad, str(bad[:3]))
    check('sin errores de JS al recargar', not errs, '; '.join(errs[:3]))
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
            check('sin avisos de datos dañados', not ev('stateRecovered') and not ev('partsLost') and not ev("!!document.querySelector('#dg .dialog-box')"))
            pg.clock.run_for(3000)  # lo que hace la app al arrancar (medallas…), antes de contar escrituras

            # ── escribir solo lo que cambia y agrupar los guardados de una acción ──
            ev("__T.spy();S.water[dayKey(new Date())]=750;saveState();saveState();saveState()")
            check('un cambio de ajustes escribe solo el núcleo, una vez', ev('savesDone().then(()=>__w)') == ['ff'], str(ev('__w')))
            check('y cada guardado deja su marca antes de escribir y al terminar', ev('__wa') == ['ffrev', 'ff', 'ffrev'], str(ev('__wa')))
            ev("__w.length=0;S.meals['2026-09-02'][1]=[{n:'Kiwi',g:80,b:[61,15,1,.5,3,0]}];saveState()")
            check('una comida escribe solo su mes', ev('savesDone().then(()=>__w)') == ['ff:meals:2026-09'], str(ev('__w')))
            ev("__w.length=0;S.logs.push({d:dayKey(new Date()),n:'Extra',v:100,s:3,m:20,q:7});saveState()")
            check('un entreno escribe solo los entrenos', ev('savesDone().then(()=>__w)') == ['ff:logs'], str(ev('__w')))
            ev("__w.length=0;__wa.length=0;saveState()")
            check('sin cambios no escribe nada (ni la marca)', ev('savesDone().then(()=>__wa)') == [], str(ev('__wa')))
            ev("__w.length=0;__wa.length=0;delete S.meals['2026-08-14'];saveState()")
            check('un mes que se queda sin comidas se borra, después de quitarlo del núcleo', ev('savesDone().then(()=>__w)') == ['ff', '-ff:meals:2026-08'] and 'ff:meals:2026-08' not in ev('__T.pkeys()') and 'ff:meals:2026-08' not in ev("JSON.parse(localStorage.getItem('ff'))._pk"), str(ev('__w')))
            check('y la marca de haber terminado va en cuanto está lo que se lee al abrir la app (las partes y el núcleo)', ev('__wa') == ['ffrev', 'ff', 'ffrev', '-ff:meals:2026-08'], str(ev('__wa')))
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
            # (al salir de la app también se sincroniza ya lo pendiente: la sincronización anota su estado en ffsync)
            check('al salir de la app, el repaso se hace ya', ev("savesDone().then(()=>__w.filter(k=>k!='ffsync'))") == ['ff:logs'], str(ev('__w')))
            ev("JSON.stringify=__js0;__T.unspy()")
            pg.clock.run_for(2500)

            # ── un guardado que falla, con otro decidido mientras estaba a medias (lo encontró tests/syncfuzz.py) ──
            # El primero lleva un mes nuevo de comidas. El segundo se decide con el primero aún a medias y solo cambia el
            # núcleo, que ya nombra ese mes. Si el primero falla (sin sitio), el segundo no puede escribir: el núcleo nombraría
            # una parte que no está y, al volver a abrir la app, no se podrían leer los datos. Aquí la escritura del primero se
            # queda a medias (la transacción abierta, sin el commit con que la app la cierra antes) hasta que se le dice que falle
            hold = """window.__put1=IDBObjectStore.prototype.put;window.__commit1=IDBTransaction.prototype.commit;window.__hold=1;
              IDBTransaction.prototype.commit=function(){};
              IDBObjectStore.prototype.put=function(){const st=this,tx=st.transaction,keep=()=>{try{if(window.__hold)st.get('__').onsuccess=keep;else tx.abort()}catch(e){}};
                const r=st.get('__');r.onsuccess=keep;return r};0"""
            release = "IDBObjectStore.prototype.put=__put1;IDBTransaction.prototype.commit=__commit1;0"
            named = "JSON.parse(localStorage.getItem('ff'))._pk"
            n_logs, rest0 = ev('S.logs.length'), ev("JSON.parse(localStorage.getItem('ff')).rest")
            ev(hold)
            ev("S.meals['2027-01-05']={0:[{n:'Uva',g:90,b:[60,15,.5,.2,1,0]}]};saveState(mealsPart('2027-01-05'));0")
            ev("S.defaultRest=77;saveState('core');0")
            ev("window.__hold=0;0")
            ev("savesDone()")
            check('si un guardado falla, el que se decidió mientras tanto no escribe: el núcleo no nombra la parte que no se guardó', 'ff:meals:2027-01' not in ev(named) and 'ff:meals:2027-01' not in ev('__T.pkeys()') and ev("JSON.parse(localStorage.getItem('ff')).rest") == rest0, '%s %s' % (ev(named), ev("JSON.parse(localStorage.getItem('ff')).rest")))
            check('y consta que hay cosas sin guardar', ev('savesBroken()'))
            # el móvil sigue sin sitio al cerrar la app: al volver a abrirla, los datos se leen (falta lo que no cupo, y nada más)
            reload()
            check('al volver a abrir la app, los datos se leen', not ev('partsLost') and not ev("!!document.querySelector('#dg [data-v=partsRetry]')") and ev('S.logs.length') == n_logs, str((ev('partsLost'), ev('S.logs.length'), n_logs)))
            check('y falta solo lo que no se pudo guardar', '2027-01-05' not in ev('Object.keys(S.meals)') and ev('S.defaultRest') == rest0 and '2026-09-02' in ev('Object.keys(S.meals)'), str(ev('S.defaultRest')))
            # y si el sitio vuelve con la app abierta, el siguiente guardado lo deja todo escrito
            ev(hold)
            ev("S.meals['2027-01-05']={0:[{n:'Uva',g:90,b:[60,15,.5,.2,1,0]}]};saveState(mealsPart('2027-01-05'));0")
            ev("S.defaultRest=77;saveState('core');0")
            ev("window.__hold=0;0")
            ev("savesDone()")
            ev(release)
            ev("S.water[dayKey(new Date())]=1250;saveState('core');0")
            check('cuando vuelve el sitio, el siguiente guardado lo escribe todo: el mes nuevo, y el núcleo que lo nombra', 'ff:meals:2027-01' in ev('savesDone().then(()=>__T.pkeys())') and 'ff:meals:2027-01' in ev(named) and ev("JSON.parse(localStorage.getItem('ff')).rest") == 77 and ev('__T.stored().then(s=>__T.can(s)===__T.can(stateToStored(S)))'), str(ev(named)))
            pg.clock.run_for(6000)
            check('y deja de constar que hay cosas sin guardar', ev('savesDone().then(()=>!savesBroken())'))
            ev("delete S.meals['2027-01-05'];S.defaultRest=%d;saveState()" % (rest0 if isinstance(rest0, int) else 90))
            ev("savesDone()")

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
            # (la acción del botón, sin cerrar el aviso con el historial)
            reload_by(pg, "A.partsRetry()")
            pg.clock.run_for(1500)
            ev(HELPERS)
            check('con la parte de vuelta, «Reintentar» arranca con todo', not ev('partsLost') and ev('S.logs.length') == nlogs and ev("!document.querySelector('#dg .dialog-box')"))

            # ── restaurar una copia con un guardado pendiente en la misma acción ──
            ev("for(let i=0;i<5;i++)S.logs.push({d:'2026-10-0'+(i+1),n:'Día '+i,v:1000,s:10,m:40,q:7});S.exerciseHistory={'Press banca':[{d:'2026-10-01',s:[[5,80,8,0]]}]};saveState()")
            # (sin los id de los entrenos: el arranque se los pone a los que no tienen, core/repair)
            before = ev('(()=>{const s=JSON.parse(JSON.stringify(stateToStored(S)));s.logs.forEach(l=>delete l.id);return __T.can(s)})()')
            ev("(()=>{const s=JSON.parse(JSON.stringify(stateToStored(S)));s.logs=s.logs.slice(0,2);s.meals={'2025-01-01':{0:[{n:'Copia',g:1,b:[1,1,1,1,0,0]}]}};s.rest=31;window.__bk=s})()")
            reload_by(pg, "S.defaultRest=999;saveState();pendingRestore={s:__bk};restoreBackup()")
            pg.clock.run_for(1500)
            ev(HELPERS)
            check('restaurar no lo pisa un guardado pendiente', ev('S.defaultRest') == 31 and ev('S.logs.length') == 2, str((ev('S.defaultRest'), ev('S.logs.length'))))
            check('y deja solo los meses de la copia', [k for k in ev('__T.pkeys()') if k.startswith('ff:meals:')] == ['ff:meals:2025-01'], str(ev('__T.pkeys()')))
            pre = ev("JSON.parse(localStorage.getItem('ffpre'))")
            pre_copy = json.loads(ev("__T.aside('pre')") or 'null') or {}
            check('la copia de antes de restaurar va aparte, en IndexedDB (en localStorage, solo su fecha)', pre.get('a') == 1 and 's' not in pre and pre_copy.get('t') == pre.get('t') and (pre_copy.get('s') or {}).get('rest') == 999, str(pre)[:100])
            reload_by(pg, 'A.backupUndo()')
            pg.clock.run_for(1500)
            ev(HELPERS)
            check('deshacer la restauración devuelve los datos anteriores', ev('S.defaultRest') == 999 and ev('(()=>{const s=JSON.parse(JSON.stringify(stateToStored(S)));s.rest=%s;s.logs.forEach(l=>delete l.id);return __T.can(s)})()' % json.dumps(json.loads(before)['rest'])) == before)
            ev("document.querySelector('#dg')&&(document.querySelector('#dg').innerHTML='')")
            # una copia previa de la V1.0.1 (entera en localStorage) se sigue pudiendo deshacer
            ev("localStorage.setItem('ffpre',JSON.stringify({t:Date.now(),v:'1.0.1',s:Object.assign(JSON.parse(JSON.stringify(stateToStored(S))),{rest:57}),w:null}))")
            ev("A.backupUndoAsk()")
            check('una copia previa de la V1.0.1 se sigue pudiendo deshacer', ev("!!document.querySelector('#dg [data-v=backupUndo]')"))
            reload_by(pg, "A.backupUndo()")
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
            # (con la app libre: sin hojas, avisos ni el recorrido, que sale tras empezar de cero con los datos de la serie de prueba;
            # el espacio usado se simula en el prototipo: en WebKit, navigator.storage puede volver a crearse tras una recolección de
            # basura y perder lo que se le haya puesto encima)
            ev("sheet();document.querySelector('#dg').innerHTML='';document.querySelector('#tour')&&document.querySelector('#tour').remove();localStorage.removeItem('ffspace');window.__est=StorageManager.prototype.estimate;StorageManager.prototype.estimate=()=>Promise.resolve({usage:85e6,quota:100e6})")
            ev('spaceCheck()')
            check('con el 85 % usado, avisa', ev("/Queda poco espacio/.test(document.querySelector('#dg').innerText)&&/85 %/.test(document.querySelector('#dg').innerText)"), ev("document.querySelector('#dg').innerText.slice(0,120)"))
            check('con «Copia de seguridad» a mano', ev("!!document.querySelector('#dg [data-v=openBackup]')"))
            ev("document.querySelector('#dg').innerHTML='';spaceCheck()")
            check('y no vuelve a avisar hasta dentro de una semana', ev("!document.querySelector('#dg .dialog-box')"))
            ev("window.__mark=1;localStorage.removeItem('ffspace');window.__tr=document.createElement('div');__tr.id='tour';document.body.appendChild(__tr);spaceCheck()")
            check('con algo delante (el recorrido), espera', ev("!document.querySelector('#dg .dialog-box')"))
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
            # (si no avisa, lo que hace falta para saber por qué: si la página se recargó, si sigue el espacio simulado, la última
            # medida, cuándo se avisó y los últimos errores registrados)
            why = "spaceUse().then(u=>JSON.stringify({sigue:!!window.__mark,simulado:StorageManager.prototype.estimate!==window.__est,usado:u.ratio,avisado:localStorage.getItem('ffspace'),historial:[history.length,history.state],errores:errorLog().slice(-3).map(e=>e.w+': '+e.m)}))"
            check('y avisa en cuanto la app queda libre', ev("!!document.querySelector('#dg [data-v=openBackup]')"), str(seen) + ' ' + ev(why))
            ev("document.querySelector('#dg').innerHTML=''")
            ev("localStorage.removeItem('ffspace');StorageManager.prototype.estimate=()=>Promise.resolve({usage:50e6,quota:100e6})")
            ev('spaceCheck()')
            check('con la mitad usada, no avisa', ev("!document.querySelector('#dg .dialog-box')"))
            ev("A.openDiagnostics()")
            check('Diagnóstico dice dónde están las partes y el espacio usado', until(pg, "/Espacio usado: localStorage .*IndexedDB y caché .* \\(50 %\\)/.test(document.getElementById('diagt').value)") and '(IndexedDB)' in ev("document.getElementById('diagt').value"), ev("document.getElementById('diagt').value.split('\\n').filter(l=>/Espacio|Almacenamiento/.test(l)).join(' | ')")[:300])
            ev("StorageManager.prototype.estimate=__est;sheet()")

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
        two_windows(b, path, url)
        after_reload(b, path, url)
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
