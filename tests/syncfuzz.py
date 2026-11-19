"""StrataFit · pruebas al azar del guardado y la sincronización (core/persist, cloud/sync).

Dos móviles de la misma cuenta (dos contextos del navegador con el Firebase de prueba de tests/fakefb.py), cada uno con una o
dos pestañas, hacen una secuencia aleatoria, distinta para cada semilla, de:
  · acciones: anotar y borrar entrenos, anotar comidas e historial de ejercicios, cambiar un ajuste;
  · fallos: el móvil sin sitio (de seis formas: NO_SPACE), sin red, la app cerrada sin dar tiempo a guardar y la app abierta
    en dos pestañas;
  · sincronizaciones y recargas;
  · y, de vez en cuando, una racha de las que más riesgo tienen (Run.burst), con sus detalles al azar: bajar algo sin poder
    guardarlo y cerrar, subir con el guardado a medias, borrar sin red lo recién bajado, sincronizar desde la pestaña que se
    quedó atrás, dos guardados seguidos con el primero fallando y volver el sitio con los guardados lentos.
Mientras, se lleva la cuenta de qué TIENE que acabar estando (lo que quedó guardado en el móvil o subido a la nube) y qué NO
(lo borrado y confirmado igual). Lo que no llegó a confirmarse antes de cerrarse su pestaña puede acabar de las dos formas.
Al final se arregla todo (vuelven el sitio y la red, se cierran las pestañas de más, se recarga y se sincroniza) y se comprueba:
  1. no falta nada de lo que tenía que estar;                4. volver a abrir y sincronizar no cambia nada en la nube;
  2. no vuelve nada de lo borrado;                           5. ningún dato repetido;
  3. los dos móviles y la nube tienen lo mismo;              6. sin errores de JS ni datos que no se puedan leer.

El punto 2 tiene una salvedad, que es el límite conocido de la sincronización (docs/tecnica/backend.md, «Lo que puede volver a
aparecer»): el móvil guarda primero los datos y después apunta lo sincronizado, nunca al revés. Si la app se cierra entre lo
uno y lo otro, o mientras no puede apuntarlo (sin sitio), lo que bajó o subió queda guardado sin constar como sincronizado, y
si justo eso se borra antes de la siguiente sincronización de ese móvil, vuelve a aparecer. Aquí solo se perdona cuando se
dan esas condiciones (Run.leaving y Run.after_excused); en cualquier otro caso, que vuelva algo borrado es un fallo. Que falte
algo (punto 1) no se perdona nunca.

Una semilla que falla se repite igual: `python3 tests/syncfuzz.py dist/stratafit.html 7 80 -v` enseña sus pasos (y `-vv`,
además, lo que cada pestaña tiene en memoria, guardado y apuntado tras cada paso).

Uso: python3 tests/syncfuzz.py dist/stratafit.html [semillas: 1,2,5 o 1-8] [pasos] [-v|-vv]
"""
import os, re, sys, json, random
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts
from fakefb import FakeFirebase

HERE = os.path.dirname(os.path.abspath(__file__))
INIT = '\n'.join(l for l in open(os.path.join(HERE, 'init.js'), encoding='utf-8').read().split('\n') if not l.startswith('//'))
FULL = "throw new DOMException('sin espacio','QuotaExceededError')"
KEEP = "window.__put=window.__put||IDBObjectStore.prototype.put;window.__si=window.__si||Storage.prototype.setItem;window.__commit=window.__commit||IDBTransaction.prototype.commit;"
# El móvil sin sitio, de seis formas. Se pone en cada pestaña del móvil; al recargarla hay que volver a ponerlo.
NO_SPACE = {
    # IndexedDB falla al momento: no se escribe ninguna parte (entrenos, historial, comidas)
    'idb': KEEP + "IDBObjectStore.prototype.put=function(){%s};0" % FULL,
    # IndexedDB tarda y al final falla: el guardado sigue en marcha mientras la sincronización termina. La escritura no se
    # hace: la transacción se mantiene abierta con lecturas (y sin el commit con que la app la cierra antes) y luego se aborta
    'lento': KEEP + """IDBTransaction.prototype.commit=function(){};IDBObjectStore.prototype.put=function(){const st=this,tx=st.transaction,until=Date.now()+120;
 const keep=()=>{try{if(Date.now()<until)st.get('__').onsuccess=keep;else tx.abort()}catch(e){}};const r=st.get('__');r.onsuccess=keep;return r};0""",
    # localStorage lleno: no entra nada que ocupe más que lo que había (el núcleo y lo sincronizado crecen; la marca de quién
    # guardó el último, no). Las partes, que van en IndexedDB, sí se escriben
    'ls': KEEP + "Storage.prototype.setItem=function(k,v){if(String(v).length>(this.getItem(k)||'').length){%s}return window.__si.apply(this,arguments)};0" % FULL,
    # el sitio se acaba justo después de apuntar lo sincronizado: lo que quedara por escribir de lo que eso describe, ya no entra
    'apuntado': KEEP + "Storage.prototype.setItem=function(k){const r=window.__si.apply(this,arguments);if(k=='ffsync')IDBObjectStore.prototype.put=function(){%s};return r};0" % FULL,
    # y justo antes: lo sincronizado no se puede apuntar, y desde entonces tampoco se escriben las partes
    'sin apuntar': KEEP + "Storage.prototype.setItem=function(k){if(k=='ffsync'){IDBObjectStore.prototype.put=function(){%s};%s}return window.__si.apply(this,arguments)};0" % (FULL, FULL),
    # los guardados salen bien, pero tardan (la transacción se retiene abierta), y el sitio se acaba en cuanto se apunta lo
    # sincronizado: lo que se apunte por delante de un guardado aún a medias se queda sin escribir
    'tarda y se acaba': KEEP + """IDBTransaction.prototype.commit=function(){};IDBObjectStore.prototype.put=function(){const st=this,until=Date.now()+150,r=window.__put.apply(this,arguments);
 const keep=()=>{try{if(Date.now()<until)st.get('__').onsuccess=keep}catch(e){}};keep();return r};
 Storage.prototype.setItem=function(k){const r=window.__si.apply(this,arguments);if(k=='ffsync')IDBObjectStore.prototype.put=function(){%s};return r};0""" % FULL,
}
SPACE = "if(window.__put)IDBObjectStore.prototype.put=window.__put;if(window.__si)Storage.prototype.setItem=window.__si;if(window.__commit)IDBTransaction.prototype.commit=window.__commit;0"
# con estas formas, lo sincronizado no se puede apuntar aunque los guardados de la pestaña vayan bien
CANT_NOTE = ('ls', 'sin apuntar')
# lo que hay en una pestaña, de lo que ponen estas pruebas: entrenos L…, alimentos M…, registros de historial H… y el ajuste
HAS = """(()=>({L:S.logs.map(l=>l.id).filter(i=>/^L\\d+$/.test(i)),
 M:Object.values(S.meals||{}).flatMap(d=>Object.values(d).flatMap(a=>(Array.isArray(a)?a:[]).map(i=>i.n))).filter(n=>/^M\\d+$/.test(n)),
 H:Object.values(S.exerciseHistory||{}).flat().map(e=>'H'+((e.s||[])[0]||[])[1]).filter(n=>/^H\\d+$/.test(n)),rest:S.defaultRest}))()"""
# lo que el móvil tiene guardado (lo que habrá al volver a abrir la app) y lo que tiene apuntado como sincronizado, de los entrenos
STORED = """savesDone().then(()=>__stored()).then(st=>{const b=(JSON.parse(localStorage.getItem('ffsync')||'{}').base)||{},l=(st||{}).logs;
 return {stored:(Array.isArray(l)?l:[]).map(x=>x.id).filter(i=>/^L\\d+$/.test(i)),noted:Object.keys(b).filter(i=>i.startsWith('logs')).flatMap(i=>Object.keys((b[i]||{}).h||{}))}})"""
# espera a que la pestaña termine lo que tenga en marcha (la vuelta de sincronización y los guardados) y dice cómo queda
SETTLE = """(async()=>{for(let i=0;i<600&&syncState().st=='run';i++)await new Promise(r=>setTimeout(r,5));
 await savesDone();await new Promise(r=>setTimeout(r,0));await savesDone();return {ok:!savesBroken(),stale:!!instanceStale}})()"""
SAVED = "savesDone().then(()=>({ok:!savesBroken(),stale:!!instanceStale}))"
DAYS = ['2025-12-30', '2025-12-31', '2026-01-02', '2026-10-30', '2026-11-03', '2026-11-04']
EXERCISES = ['Press banca', 'Sentadilla', 'Remo con barra']
NET_NOISE = re.compile(r'Load failed|Failed to fetch|NetworkError|cancell?ed', re.I)
fails = []
VERBOSE = '-v' in sys.argv or '-vv' in sys.argv
DEBUG = '-vv' in sys.argv
GONE = object()     # lo que devuelve Run.ev si la pestaña se recargó sola mientras tanto
# con -vv, tras cada paso: lo que cada pestaña tiene en memoria, lo guardado en el móvil y lo apuntado como sincronizado
STATE = """savesDone().then(()=>__stored()).then(st=>{const m=JSON.parse(localStorage.getItem('ffsync')||'{}'),b=m.base||{};
 const ids=k=>Object.keys(b).filter(i=>i.startsWith(k)).flatMap(i=>Object.keys((b[i]||{}).h||{}));
 return {mem:S.logs.map(l=>l.id).join(),guardado:((st||{}).logs||[]).map(l=>l.id).join(),apuntado:ids('logs').join(),atras:+!!instanceStale,sinGuardar:+savesBroken(),sync:syncState().st}})"""


def say(*a):
    if VERBOSE:
        print('   ', *a, flush=True)


def wait(pg, expr, timeout=20000):
    for _ in range(int(timeout / 50)):
        try:
            if pg.evaluate(expr):
                return True
        except Exception:
            pass
        pg.wait_for_timeout(50)
    raise AssertionError('no se cumple: ' + expr)


class Page:
    """Una pestaña de un móvil.
    pending: lo que ha hecho y aún no consta ni guardado en el móvil ni subido ({dato: 'add' | 'del'}).
    dels: los entrenos que ha borrado desde que se abrió.
    cant_note: el móvil no tiene sitio para apuntar lo sincronizado desde antes de su último guardado o sincronización buenos."""

    def __init__(self, dev, pg):
        self.dev, self.pg, self.pending, self.dels, self.cant_note, self.errs = dev, pg, {}, set(), False, []
        # (una petición a la nube que se corta al cerrar o recargar la app no es un error del código: WebKit la cuenta como tal)
        pg.on('pageerror', lambda e: None if NET_NOISE.search(str(e)) else self.errs.append(str(e)[:200]))


class Device:
    def __init__(self, name, ctx):
        self.name, self.ctx, self.pages, self.nospace, self.offline = name, ctx, [], None, False


class Run:
    def __init__(self, b, path, seed):
        self.b, self.path, self.url, self.seed = b, path, app_url(path), seed
        self.rnd = random.Random(seed)
        self.fb = FakeFirebase()
        self.uid = None
        self.devs = []
        self.want = {}          # lo que tiene que pasar con cada dato: 'P' estar, 'A' no estar, 'U' cualquiera de las dos
        self.origin = {}        # en qué móvil se anotó cada entreno
        self.seen_cloud = set() # los entrenos que han llegado a estar en la nube
        self.risk = {}          # por móvil: entrenos guardados sin constar como sincronizados (el límite conocido)
        self.unsure = set()     # entrenos cuyo borrado no se puede dar por seguro, por ese límite
        self.n = 0
        self.trace = []
        self.errs = []

    # ── los móviles y sus pestañas ──
    def device(self, name):
        c = self.b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, color_scheme='dark', **context_opts(self.path))
        c.add_init_script('window.__sfNoSession=1;window.__sfNet=1;')
        c.add_init_script(INIT)
        self.fb.install(c)
        self.risk[name] = set()
        return Device(name, c)

    def started(self, p):
        """La pestaña acaba de abrirse o de recargarse: empieza de cero, con el fallo de sitio que tenga su móvil."""
        wait(p.pg, 'window.__ffok && !window.__old')
        if p.dev.nospace:
            p.pg.evaluate(NO_SPACE[p.dev.nospace])
        p.dels = set()
        p.cant_note = p.dev.nospace in CANT_NOTE

    def open(self, dev):
        pg = dev.ctx.new_page()
        p = Page(dev, pg)
        pg.goto(self.url)
        self.started(p)
        dev.pages.append(p)
        return p

    def ev(self, p, js):
        """Ejecuta `js` en la pestaña. Si la pestaña se recarga sola a mitad (lo hace al quedarse atrás), se espera a que
        arranque y cuenta como cerrada: lo que tuviera sin confirmar, a saber. Una pestaña que se quedó atrás no escribe, así
        que no deja nada guardado por delante de lo apuntado."""
        try:
            return p.pg.evaluate(js)
        except Exception as e:
            if 'context was destroyed' not in str(e) and 'navigation' not in str(e):
                raise
            self.lost(p)
            self.started(p)
            return GONE

    # ── la cuenta de lo que tiene que acabar estando ──
    def confirmed(self, p):
        for x, op in p.pending.items():
            self.want[x] = 'P' if op == 'add' else 'U' if x in self.unsure else 'A'
        p.pending.clear()

    def lost(self, p):
        """La pestaña se cierra o se recarga con cosas sin confirmar: pudieron subirse antes (la app también sincroniza
        sola) o no."""
        for x in p.pending:
            self.want[x] = 'U'
        p.pending.clear()

    def doubt(self, x):
        """El borrado de `x` no se puede dar por seguro (el límite conocido: ver arriba)."""
        self.unsure.add(x)
        if self.want.get(x) == 'A':
            self.want[x] = 'U'

    def saved(self, p):
        """Espera a que la pestaña termine de guardar. 'guardado' (todo lo suyo está en el móvil: queda confirmado), 'sin
        guardar' (el móvil no ha podido), 'atrás' (otra pestaña guardó después: esta no escribe) o 'recargada' (se recargó
        sola mientras tanto)."""
        r = self.ev(p, SAVED)
        if r is GONE:
            return 'recargada'
        if r['stale']:
            # lo que tuviera sin confirmar se va al recargarla (si antes llegó a subirse o no, a saber)
            self.lost(p)
            return 'atrás'
        if r['ok']:
            self.confirmed(p)
            if p.dev.nospace not in CANT_NOTE:
                p.cant_note = False
            return 'guardado'
        return 'sin guardar'

    def leaving(self, p, crash=False):
        """Justo antes de cerrar o recargar la pestaña. Dice si es un cierre de los que pueden dejar datos guardados sin
        constar como sincronizados: a medias de todo (`crash`), sin haber podido guardar, o sin sitio para apuntarlo. En un
        cierre normal, la pestaña termina antes lo que tenga en marcha, y ya no hay excusa."""
        if crash:
            return True
        r = self.ev(p, SETTLE)
        if r is GONE or r['stale']:
            return False
        if r['ok']:
            self.confirmed(p)
        return not r['ok'] or p.cant_note

    def after_excused(self, dev, dels):
        """Tras un cierre de esos en el móvil `dev`, de una pestaña que había borrado `dels`: lo que quedó guardado sin
        constar como sincronizado puede volver si se borra (aquí o en el otro móvil) antes de que este móvil sincronice."""
        self.sample()
        st = self.ev(dev.pages[0], STORED)
        if st is GONE:
            st = self.ev(dev.pages[0], STORED)
        noted, stored = set(st['noted']), set(st['stored'])
        for x in dels - noted:
            self.doubt(x)
        ahead = {x for x in stored - noted if self.origin.get(x) != dev.name or x in self.seen_cloud}
        self.risk[dev.name] |= ahead
        deleting = {x for d in self.devs for q in d.pages for x, op in q.pending.items() if op == 'del'}
        for x in ahead:
            if self.want.get(x) == 'A' or x in deleting:
                self.doubt(x)

    def sample(self):
        self.seen_cloud |= set(self.cloud()['L'])

    # ── acciones ──
    def new_id(self, kind, dev):
        self.n += 1
        x = kind + str(self.n)
        self.origin[x] = dev.name
        return x

    def act(self, p, x, op, js):
        """Hace en la pestaña `p` la acción `js`, que pone (`op` 'add') o borra ('del') el dato `x`, y apunta qué se espera
        de él: confirmado si quedó guardado; pendiente si el móvil no pudo guardar; y si la pestaña se había quedado atrás,
        nada (no llega a escribirse), salvo que se quedara atrás justo mientras guardaba (entonces, a saber)."""
        was = self.ev(p, '!!instanceStale')
        if was is GONE or self.ev(p, js) is GONE:
            self.want[x] = 'U'
            return 'recargada'
        p.pending[x] = op
        if op == 'del':
            p.dels.add(x)
        r = self.ev(p, SAVED)
        if r is GONE:
            self.want[x] = 'U'
            return 'recargada'
        if r['stale']:
            del p.pending[x]
            if not was:
                self.want[x] = 'U'
            self.lost(p)
            return 'atrás'
        if r['ok']:
            self.confirmed(p)
            if p.dev.nospace not in CANT_NOTE:
                p.cant_note = False
            return 'guardado'
        return 'sin guardar'

    def log_js(self, x, hint="'logs'"):
        return "S.logs.push({id:'%s',d:'%s',n:'%s',v:%d,s:12,m:40,q:7});saveState(%s)" % (x, self.rnd.choice(DAYS), x, 1000 + self.n, hint)

    def add_log(self, p):
        x = self.new_id('L', p.dev)
        hint = "'logs'" if self.rnd.random() < .7 else ''
        return x, self.act(p, x, 'add', "(()=>{%s;return 1})()" % self.log_js(x, hint))

    def del_log(self, p, x=None):
        have = self.ev(p, HAS)
        if have is GONE or not have['L'] or (x and x not in have['L']):
            return None, 'nada que borrar'
        x = x or self.rnd.choice(sorted(have['L']))
        hint = "'logs'" if self.rnd.random() < .7 else ''
        if any(x in r for r in self.risk.values()):
            self.doubt(x)
        return x, self.act(p, x, 'del', "(()=>{S.logs=S.logs.filter(l=>l.id!='%s');saveState(%s);return 1})()" % (x, hint))

    def log_and_sync(self, p):
        """Anota un entreno y sincroniza sin esperar a que termine de guardarse."""
        x = self.new_id('L', p.dev)
        r = self.ev(p, "(()=>{%s;return syncNow().then(()=>({st:syncState().st,stale:!!instanceStale}))})()" % self.log_js(x))
        if r is GONE:
            self.want[x] = 'U'
            return x, 'recargada'
        if r['stale']:
            self.lost(p)
            return x, 'atrás'
        p.pending[x] = 'add'
        self.synced(p, r['st'])
        return x, 'a la vez: ' + r['st'] + ' · ' + self.saved(p)

    def add_meal(self, p):
        x = self.new_id('M', p.dev)
        day, slot = self.rnd.choice(DAYS), self.rnd.randrange(3)
        hint = "mealsPart('%s')" % day if self.rnd.random() < .7 else ''
        js = "(()=>{const m=S.meals['%s']=S.meals['%s']||{};(m[%d]=m[%d]||[]).push({n:'%s',g:100,b:[%d,10,5,2,0,0]});saveState(%s);return 1})()" % (day, day, slot, slot, x, 100 + self.n, hint)
        return x, self.act(p, x, 'add', js)

    def add_hist(self, p):
        x = self.new_id('H', p.dev)
        ex = self.rnd.choice(EXERCISES)
        hint = "'hist'" if self.rnd.random() < .7 else ''
        js = "(()=>{const h=S.exerciseHistory=S.exerciseHistory||{};(h['%s']=h['%s']||[]).unshift({d:'%s',s:[[5,%s,0]]});saveState(%s);return 1})()" % (ex, ex, self.rnd.choice(DAYS), x[1:], hint)
        return x, self.act(p, x, 'add', js)

    def two_saves(self, p):
        """Anota una comida en un mes que aún no tiene parte guardada y, con ese guardado todavía a medias, cambia un ajuste:
        el segundo guardado se decide dando por escrito lo del primero."""
        x = self.new_id('M', p.dev)
        day = '%d-%02d-15' % (2030 + self.n // 12, self.n % 12 + 1)
        js = "(()=>{(S.meals['%s']=S.meals['%s']||{})[0]=[{n:'%s',g:100,b:[%d,10,5,2,0,0]}];saveState(mealsPart('%s'));setTimeout(()=>{S.defaultRest=%d;saveState('core')},0);return new Promise(r=>setTimeout(r,30))})()" % (day, day, x, 100 + self.n, day, 60 + 5 * self.rnd.randrange(30))
        return x, self.act(p, x, 'add', js)

    def set_rest(self, p):
        v = 60 + 5 * self.rnd.randrange(30)
        self.ev(p, "(()=>{S.defaultRest=%d;saveState('core');return 1})()" % v)
        return 'descanso=%d' % v, self.saved(p)

    def synced(self, p, st):
        """Lo que se sabe tras una vuelta de sincronización de la pestaña que acabó en `st`."""
        if st == 'ok':
            self.confirmed(p)
            # lo que este móvil tuviera guardado sin apuntar ya consta (o ha vuelto a subir)
            self.risk[p.dev.name].clear()
            if p.dev.nospace not in CANT_NOTE:
                p.cant_note = False
        elif st != 'off':
            # a medias: lo que tenía pudo llegar a subirse o no
            self.lost(p)

    def sync(self, p):
        if self.ev(p, 'syncNow().then(()=>1)') is GONE:
            return 'recargada'
        r = self.ev(p, "({st:syncState().st,stale:!!instanceStale})")
        if r is GONE:
            return 'recargada'
        if r['stale']:
            self.lost(p)
            return 'atrás'
        self.synced(p, r['st'])
        return r['st']

    def reload(self, p, crash=False):
        """Cierra la app y la vuelve a abrir. Con normalidad, lo que estuviera guardándose o sincronizando termina antes; con
        `crash`, se cierra de golpe."""
        excused = self.leaving(p, crash)
        self.lost(p)
        dels = p.dels
        if crash:
            try:
                p.pg.evaluate("window.__old=1;location.reload();0")
            except Exception:
                pass
        else:
            p.pg.reload()
        self.started(p)
        if excused:
            self.after_excused(p.dev, dels)
        return 'recargada'

    def close(self, dev, q):
        """Cierra una pestaña de más del móvil."""
        excused = self.leaving(q)
        dev.pages.remove(q)
        self.lost(q)
        self.errs += q.errs
        q.pg.close()
        if excused:
            self.after_excused(dev, q.dels)
        return 'pestaña cerrada'

    def crash_after(self, p):
        """Anota un entreno y la app se cierra de golpe: puede quedar guardado o no."""
        x = self.new_id('L', p.dev)
        try:
            p.pg.evaluate("(()=>{%s;return 1})()" % self.log_js(x))
        except Exception:
            pass
        self.want[x] = 'U'
        self.reload(p, crash=True)
        return x, 'cerrada a medias'

    def space(self, dev, kind):
        dev.nospace = kind
        for p in dev.pages:
            self.ev(p, SPACE)
            if kind:
                self.ev(p, NO_SPACE[kind])
            if kind in CANT_NOTE:
                p.cant_note = True
        return kind or 'con sitio'

    def heal(self, dev, p):
        """Vuelve el sitio y la pestaña lo guarda todo: desde aquí, sus guardados vuelven a ir bien."""
        self.space(dev, None)
        if self.ev(p, "saveState();0") is GONE:
            return 'recargada'
        return 'con sitio · ' + self.saved(p)

    def net(self, dev, on):
        dev.offline = not on
        self.fb.set_offline(dev.ctx, not on)
        return 'con red' if on else 'sin red'

    # ── una semilla ──
    def one(self, dev, p, op, arg=None):
        """Una acción en la pestaña `p` del móvil `dev`. Devuelve (el dato que pone o quita, cómo acaba)."""
        r = self.rnd
        tag = dev.name + str(dev.pages.index(p) + 1)
        if op == 'log':
            out = self.add_log(p)
        elif op == 'del':
            out = self.del_log(p, arg)
        elif op == 'meal':
            out = self.add_meal(p)
        elif op == 'hist':
            out = self.add_hist(p)
        elif op == 'rest':
            out = self.set_rest(p)
        elif op == 'two':
            out = self.two_saves(p)
        elif op == 'sync':
            out = ('', self.sync(p))
        elif op == 'logsync':
            out = self.log_and_sync(p)
        elif op == 'reload':
            out = ('', self.reload(p))
        elif op == 'crash':
            out = self.crash_after(p)
        elif op == 'space':
            out = ('', self.space(dev, arg if arg else None if dev.nospace else r.choice(['idb', 'idb', 'lento', 'lento', 'ls', 'apuntado', 'sin apuntar'])))
        elif op == 'heal':
            out = ('', self.heal(dev, p))
        elif op == 'net':
            out = ('', self.net(dev, dev.offline if arg is None else arg))
        elif len(dev.pages) > 1:
            out = ('', self.close(dev, r.choice(dev.pages)))
        else:
            self.open(dev)
            out = ('', 'pestaña nueva')
        self.trace.append('%s %s %s → %s' % (tag, op, out[0] or '', out[1]))
        say(self.trace[-1])
        self.sample()
        if DEBUG:
            for d in self.devs:
                for i, q in enumerate(d.pages):
                    try:
                        print('        %s%d %s' % (d.name, i + 1, json.dumps(q.pg.evaluate(STATE), ensure_ascii=False)), flush=True)
                    except Exception as e:
                        print('        %s%d (%s)' % (d.name, i + 1, str(e)[:60]), flush=True)
        return out

    def burst(self, kind, dev, other):
        """Una racha de las que más riesgo tienen. Todas empiezan con el móvil guardando bien (si ya venía sin poder guardar,
        la app no apunta nada de lo que sincroniza y no hay nada que romper)."""
        r = self.rnd
        p, q = dev.pages[0], other.pages[0]
        data = lambda: r.choice(['log', 'log', 'meal', 'hist', 'del'])
        if kind == 'baja':
            # el otro móvil anota y sube; este lo baja con un guardado que falla, y se cierra antes de poder guardar
            self.one(other, q, 'log')
            self.one(other, q, 'sync')
            self.one(dev, p, 'heal')
            self.one(dev, p, 'space', r.choice(['idb', 'idb', 'lento', 'apuntado', 'sin apuntar']))
            self.one(dev, p, 'sync')
            if r.random() < .4:
                self.one(dev, p, data())
            self.one(dev, p, r.choice(['reload', 'reload', 'crash']))
            self.one(dev, p, 'space')
            self.one(dev, p, 'sync')
        elif kind == 'sube':
            # este móvil anota y sube a la vez, con un guardado que tarda y falla, y se cierra antes de poder guardar
            self.one(dev, p, 'heal')
            self.one(dev, p, 'space', r.choice(['lento', 'lento', 'apuntado', 'idb']))
            self.one(dev, p, 'logsync')
            self.one(dev, p, r.choice(['reload', 'reload', 'crash']))
            self.one(dev, p, 'space')
            self.one(dev, p, 'sync')
        elif kind == 'vuelve el sitio':
            # baja algo sin poder guardarlo; vuelve el sitio y la app guarda; después se borra sin red y se cierra
            x = self.one(other, q, 'log')[0]
            self.one(other, q, 'sync')
            self.one(dev, p, 'heal')
            self.one(dev, p, 'space', r.choice(['idb', 'lento', 'ls', 'sin apuntar']))
            self.one(dev, p, 'sync')
            self.one(dev, p, r.choice(['heal', 'heal', 'space']))
            if r.random() < .5:
                self.one(dev, p, data())
            self.one(dev, p, 'net', False)
            self.one(dev, p, 'del', x)
            self.one(dev, p, 'reload')
            self.one(dev, p, 'net', True)
            self.one(dev, p, 'sync')
        elif kind == 'vuelve despacio':
            # lo sincronizado está esperando a apuntarse (bajó algo sin poder guardarlo) y hay algo nuevo en la nube; vuelve
            # el sitio, pero los guardados tardan: el que arregla el móvil sigue a medias mientras baja lo nuevo
            self.one(other, q, 'log')
            self.one(other, q, 'sync')
            self.one(dev, p, 'heal')
            self.one(dev, p, 'space', 'idb')
            self.one(dev, p, 'sync')
            self.one(other, q, 'log')
            self.one(other, q, 'sync')
            self.one(dev, p, 'space', 'tarda y se acaba')
            self.one(dev, p, 'logsync')
            self.one(dev, p, r.choice(['reload', 'reload', 'crash']))
            self.one(dev, p, 'space')
            self.one(dev, p, 'sync')
        elif kind == 'a medias':
            # un guardado que tarda y falla, con otro decidido mientras tanto; y la app se cierra sin que vuelva el sitio
            self.one(dev, p, 'heal')
            self.one(dev, p, 'space', r.choice(['lento', 'lento', 'idb']))
            self.one(dev, p, 'two')
            if r.random() < .4:
                self.one(dev, p, data())
            self.one(dev, p, 'reload')
            self.one(dev, p, 'space')
            self.one(dev, p, 'sync')
        elif kind == 'dos pestañas':
            # la app abierta dos veces: una guarda, la otra (que se ha quedado atrás) sincroniza lo que subió el otro móvil
            if len(dev.pages) < 2:
                self.one(dev, p, 'tab')
            p1, p2 = dev.pages[0], dev.pages[1]
            if r.random() < .5:
                p1, p2 = p2, p1
            self.one(dev, p1, r.choice(['log', 'log', 'meal', 'hist']))
            # (la otra, que se ha quedado atrás, intenta guardar lo suyo: no debe pisar lo de la primera)
            self.one(dev, p2, r.choice(['log', 'log', 'meal', 'hist']))
            self.one(other, q, 'log')
            self.one(other, q, 'sync')
            self.one(dev, p2, r.choice(['sync', 'logsync']))
            for _ in range(r.randrange(0, 3)):
                self.one(dev, r.choice(dev.pages), r.choice([data(), 'sync']))
            self.one(dev, p1, 'reload')
            self.one(dev, p1, 'sync')

    def step(self, devs):
        r = self.rnd
        dev = r.choice(devs)
        other = devs[1 - devs.index(dev)]
        k = r.random()
        if k < .24:
            self.burst(['baja', 'sube', 'vuelve el sitio', 'dos pestañas', 'a medias', 'vuelve despacio'][int(k / .04)], dev, other)
            return
        p = r.choice(dev.pages)
        op = r.choices(['log', 'del', 'meal', 'hist', 'rest', 'sync', 'logsync', 'reload', 'crash', 'space', 'net', 'tab'], [22, 9, 12, 7, 4, 18, 5, 6, 3, 5, 4, 4])[0]
        # los fallos no duran toda la secuencia: un móvil sin sitio o sin red tiende a arreglarse
        if dev.nospace and r.random() < .22:
            op = 'space'
        elif dev.offline and r.random() < .22:
            op = 'net'
        self.one(dev, p, op)

    def cloud(self):
        """Lo que hay en la nube, de lo que ponen estas pruebas."""
        uid = self.uid
        L, M, H = [], [], []
        for k in list(self.fb.docs):
            if k.startswith('users/%s/logs/' % uid):
                L += [l.get('id') for l in self.fb.part(k)]
            elif k.startswith('users/%s/meals/' % uid):
                for day in self.fb.part(k).values():
                    for items in day.values():
                        M += [i.get('n') for i in items if isinstance(i, dict)]
            elif k.startswith('users/%s/hist/' % uid):
                for entries in self.fb.part(k).values():
                    H += ['H%s' % e['s'][0][1] for e in entries]
        keep = lambda a, c: sorted(x for x in a if isinstance(x, str) and x[:1] == c and x[1:].isdigit())
        return {'L': keep(L, 'L'), 'M': keep(M, 'M'), 'H': keep(H, 'H')}

    def run(self, steps):
        A, B = self.device('A'), self.device('B')
        pa = self.open(A)
        signup(pa.pg)
        self.devs = [A]
        self.uid = self.fb.uid_of('Ana_1')
        self.sync(pa)
        pb = self.open(B)
        login(pb.pg)
        wait(pb.pg, "syncState().st=='ok'")
        devs = self.devs = [A, B]
        while len(self.trace) < steps:
            self.step(devs)
        # ── se arregla todo: sitio, red, una pestaña por móvil, y lo que cada una tenga, guardado si puede ──
        for d in devs:
            self.space(d, None)
            self.net(d, True)
            for q in d.pages[1:]:
                self.close(d, q)
            p = d.pages[0]
            self.ev(p, "saveState();0")
            self.saved(p)
            self.reload(p)
        sts = [self.sync(d.pages[0]) for d in devs * 3]
        have = {d.name: self.ev(d.pages[0], HAS) for d in devs}
        cl = self.cloud()
        name = 'semilla %d' % self.seed
        bad = []
        if any(s != 'ok' for s in sts):
            bad.append('la sincronización final no termina bien: %s' % sts)
        for k in 'LMH':
            sets = {n: sorted(h[k]) for n, h in have.items()}
            sets['nube'] = cl[k]
            if len({json.dumps(v) for v in sets.values()}) > 1:
                bad.append('no tienen lo mismo (%s): %s' % (k, {n: [x for x in v if any(x not in w for w in sets.values())] for n, v in sets.items()}))
            for n, v in sets.items():
                if len(v) != len(set(v)):
                    bad.append('datos repetidos en %s: %s' % (n, sorted({x for x in v if v.count(x) > 1})))
        if len({h['rest'] for h in have.values()}) > 1:
            bad.append('el ajuste no es el mismo: %s' % {n: h['rest'] for n, h in have.items()})
        everywhere = lambda x: all(x in h[x[0]] for h in have.values()) and x in cl[x[0]]
        nowhere = lambda x: all(x not in h[x[0]] for h in have.values()) and x not in cl[x[0]]
        gone = sorted(x for x, w in self.want.items() if w == 'P' and not everywhere(x))
        back = sorted(x for x, w in self.want.items() if w == 'A' and not nowhere(x))
        if gone:
            bad.append('FALTA lo que tenía que estar: %s' % gone)
        if back:
            bad.append('VUELVE lo borrado: %s' % back)
        # volver a abrir y sincronizar no cambia nada
        for d in devs:
            self.reload(d.pages[0])
            self.sync(d.pages[0])
        again = self.cloud()
        if again != cl:
            bad.append('volver a abrir y sincronizar cambia la nube: %s → %s' % (cl, again))
        for d in devs:
            p = d.pages[0]
            st = self.ev(p, "({lost:!!partsLost,rec:stateRecovered,pend:Object.keys(pendingDocs()||{}).length,stale:!!instanceStale,broken:savesBroken()})")
            if st['lost'] or st['rec'] or st['pend'] or st['stale'] or st['broken']:
                bad.append('el móvil %s no queda bien: %s' % (d.name, st))
            self.errs += p.errs
        if self.errs:
            bad.append('errores de JS: %s' % '; '.join(self.errs[:3]))
        counts = {w: sum(1 for v in self.want.values() if v == w) for w in 'PAU'}
        if bad:
            fails.append(name)
            print('  FALLA  %s (%d pasos; tenían que estar %d, no estar %d, da igual %d)' % (name, len(self.trace), counts['P'], counts['A'], counts['U']))
            for b in bad:
                print('         · ' + b[:600])
            print('         pasos: ' + ' | '.join(self.trace)[:8000])
        else:
            print('  ok  %s: %d pasos; están los %d que tenían que estar y ninguno de los %d borrados (%d sin confirmar)' % (name, len(self.trace), counts['P'], counts['A'], counts['U']), flush=True)
        for d in devs:
            d.ctx.close()


def signup(pg, user='Ana_1', pw='contraseña-1'):
    pg.click('[data-a=loginMode][data-v=up]')
    pg.fill('#lgu', user)
    pg.fill('#lgp', pw)
    pg.fill('#lgp2', pw)
    pg.click('[data-a=loginSubmit]')
    wait(pg, "window.__ffok && !document.getElementById('lgw') && document.querySelector('nav').style.display!='none'")
    wait(pg, "!!document.getElementById('wlc')", 30000)
    pg.click('#wlc [data-a=welcomeNext]')
    pg.click('#wlc [data-a=welcomeSex][data-v=F]')
    for k, v in (('age', '31'), ('h', '168'), ('w', '62')):
        pg.fill('#wl_' + k, v)
    pg.select_option('#wl_act', '1')
    pg.select_option('#wl_goal', '1')
    pg.click('#wlc [data-a=welcomeSave]')
    wait(pg, "!document.getElementById('wlc') && !!document.querySelector('#tour .trst')")
    pg.click('#tour [data-a=tourSkip]')


def login(pg, user='Ana_1', pw='contraseña-1'):
    pg.fill('#lgu', user)
    pg.fill('#lgp', pw)
    pg.click('[data-a=loginSubmit]')
    wait(pg, "window.__ffok && !document.getElementById('lgw') && document.querySelector('nav').style.display!='none'")


def seeds_of(text):
    out = []
    for part in text.split(','):
        if '-' in part:
            a, b = part.split('-')
            out += list(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out


def main(path, seeds, steps):
    with sync_playwright() as pw:
        b = launch(pw)
        for seed in seeds:
            Run(b, path, seed).run(steps)
        b.close()
    print('FALLAN: ' + ', '.join(fails) if fails else 'TODO CORRECTO')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a not in ('-v', '-vv')]
    main(args[0], seeds_of(args[1]) if len(args) > 1 else [1, 2, 3, 4], int(args[2]) if len(args) > 2 else 80)
