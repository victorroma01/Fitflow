"""Prueba de la cuenta y la nube (M2): inicio de sesión y registro, sincronización entre dos móviles (también sin conexión y
con cambios en los dos), cerrar sesión, espera tras fallos, Administración, contraseña temporal, foto con consentimiento,
borrar todos los datos y seguridad (sin código inyectado ni choques con la CSP).

  python3 tests/cloud.py dist/stratafit.html                          (Firebase de prueba en memoria: tests/fakefb.py)
  SF_CLOUD=emulador python3 tests/cloud.py dist/emu/stratafit.html    (emulador de Firebase, con firestore.rules; en la CI)
Con el emulador, la contraseña temporal la crea el script de verdad (tools/admin/contrasena.mjs, con firebase-admin).
"""
import os, sys, json, base64, subprocess, urllib.request
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts
from fakefb import FakeFirebase

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
EMU = os.environ.get('SF_CLOUD') == 'emulador'
INIT = '\n'.join(l for l in open(os.path.join(HERE, 'init.js'), encoding='utf-8').read().split('\n') if not l.startswith('//'))
fails, passes = [], []
def wait(pg, expr, timeout=20000):
    """Espera a que `expr` sea verdad en la página (wait_for_function no vale: evalúa texto y la CSP de la app lo impide)."""
    for _ in range(int(timeout / 100)):
        try:
            if pg.evaluate(expr):
                return True
        except Exception:
            pass
        pg.wait_for_timeout(100)
    raise AssertionError('no llega: ' + expr)


def check(name, cond, info=''):
    (passes if cond else fails).append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


class EmuFirebase:
    """El emulador de Firebase (firebase emulators:exec), con la misma interfaz que FakeFirebase."""
    AUTH, FS, P = 'http://127.0.0.1:9099', 'http://127.0.0.1:8080', 'demo-stratafit'

    def _req(self, url, body=None, method=None):
        r = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), method=method,
                                   headers={'Authorization': 'Bearer owner', 'Content-Type': 'application/json'})
        with urllib.request.urlopen(r, timeout=20) as f:
            t = f.read().decode()
            return json.loads(t) if t else {}

    def install(self, ctx):
        pass

    def set_offline(self, ctx, on):
        ctx.set_offline(on)

    def clear(self):
        self._req('%s/emulator/v1/projects/%s/databases/(default)/documents' % (self.FS, self.P), method='DELETE')
        self._req('%s/emulator/v1/projects/%s/accounts' % (self.AUTH, self.P), method='DELETE')

    def uid_of(self, user):
        r = self._req('%s/identitytoolkit.googleapis.com/v1/projects/%s/accounts:lookup' % (self.AUTH, self.P), {'email': [user.lower() + '@stratafit.app']})
        return r['users'][0]['localId']

    def set_role(self, user, role):
        self._req('%s/identitytoolkit.googleapis.com/v1/projects/%s/accounts:update' % (self.AUTH, self.P),
                  {'localId': self.uid_of(user), 'customAttributes': json.dumps({'role': 'admin'} if role == 'admin' else {})})

    def reset_password(self, user):
        env = dict(os.environ, FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099', FIRESTORE_EMULATOR_HOST='127.0.0.1:8080')
        r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'admin', 'contrasena.mjs'), user], env=env, capture_output=True, text=True, timeout=60)
        if r.returncode:
            raise RuntimeError(r.stdout + r.stderr)
        box = self._req('%s/v1/projects/%s/databases/(default)/documents/adminInbox' % (self.FS, self.P)).get('documents', [])
        mine = [d for d in box if d['fields']['u']['stringValue'] == user]
        return mine[-1]['fields']['p']['stringValue']

    def put(self, path, fields):
        self._req('%s/v1/projects/%s/databases/(default)/documents/%s' % (self.FS, self.P, path), {'fields': fields}, 'PATCH')

    def data(self, path):
        try:
            d = self._req('%s/v1/projects/%s/databases/(default)/documents/%s' % (self.FS, self.P, path))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            raise
        from fakefb import _dec
        return {k: _dec(v) for k, v in d.get('fields', {}).items()}

    def part(self, path):
        d = self.data(path)
        return None if d is None else json.loads(d['j'])


class FakeBackend(FakeFirebase):
    def clear(self):
        pass

    def reset_password(self, user):
        FakeFirebase.reset_password(self, user, 'Temporal-2026x')
        return 'Temporal-2026x'

    def put(self, path, fields):
        self._put(path, fields)


def main(path):
    fb = EmuFirebase() if EMU else FakeBackend()
    fb.clear()
    url = app_url(path)
    with sync_playwright() as p:
        b = launch(p)
        errs = []

        def device():
            c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, color_scheme='dark', **context_opts(path))
            c.add_init_script('window.__sfNoSession=1;window.__sfNet=1;')
            c.add_init_script(INIT)
            fb.install(c)
            pg = c.new_page()
            pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
            pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:200]) if m.type == 'error' and 'ERR_INTERNET_DISCONNECTED' not in m.text and 'Failed to load resource' not in m.text else None)
            pg.goto(url)
            wait(pg, 'window.__ffok')
            return c, pg

        def login(pg, user, pw, new=False, wait_app=True):
            if new:
                pg.click('[data-a=lgm][data-v=up]')
            pg.fill('#lgu', user)
            pg.fill('#lgp', pw)
            if new:
                pg.fill('#lgp2', pw)
            pg.click('[data-a=lgo]')
            if wait_app:
                wait(pg, "window.__ffok && !document.getElementById('lgw') && document.querySelector('nav').style.display!='none'", 20000)

        def sync(pg):
            pg.evaluate('syncNow()')
            return pg.evaluate('syncState().st')

        today = '2026-11-04'
        arroz = {'n': 'Arroz', 'g': 150, 'b': [130, 28, 2.7, 0.3, 0, 0]}
        pollo = {'n': 'Pollo', 'g': 180, 'b': [165, 0, 31, 3.6, 0, 0]}
        pan = {'n': 'Pan', 'g': 50, 'b': [260, 50, 9, 3, 3, 1]}

        # ── un móvil sin cuenta: solo el inicio de sesión ──
        c1, p1 = device()
        check('sin sesión, solo el inicio de sesión (sin la barra de pestañas)', p1.evaluate("!!document.getElementById('lgw') && document.querySelector('nav').style.display=='none'"))
        check('sin datos personales en el registro: solo usuario y contraseña', p1.evaluate("(A.lgm(0,{dataset:{v:'up'}}),[...document.querySelectorAll('#lgw input')].map(i=>i.id).join())") == 'lgu,lgp,lgp2')
        p1.fill('#lgu', 'Ana_1'); p1.fill('#lgp', 'contraseña-1'); p1.fill('#lgp2', 'otra-cosa')
        p1.click('[data-a=lgo]')
        check('contraseñas que no coinciden: aviso y no se crea nada', 'no coinciden' in p1.inner_text('#lge'))
        p1.fill('#lgu', 'a..b')
        p1.click('[data-a=lgo]')
        check('usuario no válido: aviso', 'punto' in p1.inner_text('#lge'))
        p1.evaluate("A.lgm(0,{dataset:{v:'in'}})")
        login(p1, 'Ana_1', 'contraseña-1', new=True)
        uid = fb.uid_of('Ana_1')
        prof = fb.data('users/' + uid) or {}
        check('al crear la cuenta se crea su perfil con el usuario (y nada personal)', prof.get('u') == 'Ana_1' and set(prof) <= {'u', 'sx', 'pr', 'ca', 'm'}, str(prof))
        check('y se suben el índice y el núcleo', fb.data('users/%s/data/index' % uid) is not None and fb.part('users/%s/data/core' % uid) is not None)
        check('Perfil enseña el usuario', 'Ana_1' in p1.inner_text('#app') or p1.evaluate("(S.tab=3,R(),document.querySelector('.pfn').textContent)") == 'Ana_1')
        check('el correo técnico no aparece en la app', '@stratafit.app' not in p1.content())

        # ── datos en el móvil 1 → la nube ──
        p1.evaluate("S.logs.push({d:'%s',n:'Pecho',v:4000,s:16,m:55,q:7});S.meals['%s']={0:[%s]};saveState()" % (today, today, json.dumps(arroz)))
        st = sync(p1)
        logs = fb.part('users/%s/logs/2026' % uid) or []
        meals = fb.part('users/%s/meals/2026-11' % uid) or {}
        check('un entreno y una comida se suben (con su id)', st == 'ok' and len(logs) == 1 and logs[0].get('id') and meals.get(today, {}).get('0') == [arroz], '%s %s %s' % (st, logs, meals))

        # ── móvil 2: la misma cuenta baja los datos ──
        c2, p2 = device()
        login(p2, 'ana_1', 'contraseña-1')
        check('en otro móvil, al entrar, bajan los entrenos y las comidas', p2.evaluate("S.logs.length") == 1 and p2.evaluate("JSON.stringify(S.meals['%s'][0])" % today) == json.dumps([arroz], separators=(',', ':')))
        check('y el usuario sale como se registró, aunque se entre en minúsculas', p2.evaluate('account.u') == 'Ana_1')

        # ── sin conexión en el móvil 1 y cambios en los dos ──
        fb.set_offline(c1, True)
        p1.evaluate("S.meals['%s'][0].push(%s);S.logs.push({d:'2026-11-05',n:'Pierna',v:5000,s:18,m:60,q:8});saveState()" % (today, json.dumps(pollo)))
        st = sync(p1)
        check('sin conexión: «sin conexión» y los cambios esperan en el móvil', st == 'off' and p1.evaluate('pendingDocs()') >= 1, '%s %s' % (st, p1.evaluate('pendingDocs()')))
        p2.evaluate("S.meals['%s'][1]=[%s];S.logs.push({d:'2026-11-06',n:'Espalda',v:4500,s:16,m:50,q:7});saveState()" % (today, json.dumps(pan)))
        check('el móvil 2 sube lo suyo', sync(p2) == 'ok')
        fb.set_offline(c1, False)
        check('al volver la red, el móvil 1 sincroniza', sync(p1) == 'ok')
        m1 = p1.evaluate("S.meals['%s']" % today)
        check('la comida cambiada en los dos móviles junta los alimentos de ambos', m1.get('0') == [arroz, pollo] and m1.get('1') == [pan], str(m1))
        check('y los entrenos de los dos', sorted(p1.evaluate('S.logs.map(l=>l.n)')) == ['Espalda', 'Pecho', 'Pierna'])
        sync(p2)
        check('el móvil 2 recibe lo del móvil 1', sorted(p2.evaluate('S.logs.map(l=>l.n)')) == ['Espalda', 'Pecho', 'Pierna'] and p2.evaluate("S.meals['%s'][0].length" % today) == 2)
        check('sin nada pendiente en ninguno', p1.evaluate('pendingDocs()') == 0 and p2.evaluate('pendingDocs()') == 0)

        # ── preferencias: van en el perfil y pasan al otro móvil al abrir la app ──
        p2.evaluate("S.theme='light';S.acc=2;saveState()")
        sync(p2)
        pr = (fb.data('users/' + uid) or {}).get('pr', {})
        check('las preferencias van en el perfil', pr.get('theme') == 'light' and pr.get('acc') == 2, str(pr))
        p1.reload()
        wait(p1, 'window.__ffok')
        sync(p1)
        check('y el otro móvil las aplica', p1.evaluate("S.theme") == 'light' and p1.evaluate("document.documentElement.dataset.theme") == 'light')

        # ── borrar en un móvil y sin tocar en el otro ──
        p2.evaluate("S.logs=S.logs.filter(l=>l.n!='Espalda');saveState()")
        sync(p2)
        sync(p1)
        check('un entreno borrado en un móvil se borra en el otro', sorted(p1.evaluate('S.logs.map(l=>l.n)')) == ['Pecho', 'Pierna'])

        # ── espera creciente tras cinco fallos ──
        c3, p3 = device()
        for _ in range(5):
            login(p3, 'Ana_1', 'mal-contraseña', wait_app=False)
            wait(p3, "document.getElementById('lge').textContent.length>0 && !document.querySelector('[data-a=lgo]').textContent.includes('Entrando')")
        check('contraseña incorrecta: aviso sin decir si existe el usuario', 'Usuario o contraseña incorrectos' in p3.inner_text('#lge'))
        check('tras cinco fallos, hay que esperar (botón desactivado con la cuenta atrás)', p3.evaluate("document.querySelector('[data-a=lgo]').disabled && /Espera \\d+ s/.test(document.querySelector('[data-a=lgo]').textContent)"))
        c3.close()

        # ── foto de perfil: primero el consentimiento ──
        jpeg = base64.b64decode(p1.evaluate("(()=>{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.fillStyle='#c33';x.fillRect(0,0,8,8);return c.toDataURL('image/jpeg',.8).split(',')[1]})()"))
        p1.evaluate('S.tab=3;R()')
        p1.click('.pfh [data-a=avc]')
        check('la foto pide consentimiento antes de subirla', 'Solo la ves tú' in p1.inner_text('#dg'))
        with p1.expect_file_chooser() as fc:
            p1.click('#dg [data-v=avok]')
        fc.value.set_files(files=[{'name': 'yo.jpg', 'mimeType': 'image/jpeg', 'buffer': jpeg}])
        wait(p1, "S.pf.img && S.pf.pc > 0", 10000)
        sync(p1)
        av = fb.part('users/%s/private/avatar' % uid) or {}
        check('con consentimiento, la foto se sube a su documento privado', str(av.get('img', '')).startswith('data:image/jpeg') and av.get('pc'))
        check('la foto no va en el núcleo', 'img' not in json.dumps((fb.part('users/%s/data/core' % uid) or {}).get('pf', {})))
        p1.evaluate('A.avdl()')
        sync(p1)
        check('«Quitar foto» la borra también de la nube', fb.data('users/%s/private/avatar' % uid) is None)

        # ── cerrar sesión ──
        fb.set_offline(c1, True)
        p1.evaluate("S.wl=[{d:'%s',w:80}];saveState()" % today)
        p1.evaluate('A.sout()')
        wait(p1, "!!document.querySelector('#dg h3')", 30000)
        check('cerrar sesión con cambios sin subir lo avisa', 'sin subir' in p1.inner_text('#dg'))
        p1.evaluate("document.querySelector('#dg [data-v=zno]').click()")
        fb.set_offline(c1, False)
        p1.evaluate('A.sout()')
        wait(p1, "!!document.querySelector('#dg [data-v=soutx]')", 30000)
        check('con todo subido, solo confirma', '¿Cerrar sesión?' in p1.inner_text('#dg'))
        with p1.expect_navigation():
            p1.evaluate("document.querySelector('#dg [data-v=soutx]').click()")
        wait(p1, 'window.__ffok')
        left = p1.evaluate("Object.keys(localStorage).filter(k=>k=='ff'||k.startsWith('ff:')||k=='ffacct'||k=='ffsync')")
        check('al cerrar sesión se vuelve al inicio y los datos de la cuenta se borran del móvil', p1.evaluate("!!document.getElementById('lgw')") and left == [], str(left))
        check('y siguen en la nube', len(fb.part('users/%s/logs/2026' % uid) or []) == 2 and (fb.part('users/%s/data/core' % uid) or {}).get('wl') == [{'d': today, 'w': 80}])

        # ── el admin: Administración, cuentas y contraseña temporal ──
        c4, p4 = device()
        login(p4, 'VictorAdmin_', 'admin-clave-1', new=True)
        check('una cuenta nueva no es admin: sin Administración', p4.evaluate("(S.tab=3,R(),!document.querySelector('[data-a=adm]'))"))
        fb.set_role('VictorAdmin_', 'admin')
        p4.reload()
        wait(p4, 'window.__ffok')
        sync(p4)
        p4.evaluate('S.tab=3;R()')
        check('con el rol de admin (desde GitHub), Perfil enseña Administración', p4.evaluate("!!document.querySelector('[data-a=adm]')"))
        temp = fb.reset_password('Ana_1')
        fb.put('users/uintruso', {'u': {'stringValue': '<img src=x onerror=alert(1)>'}, 'sx': {'stringValue': 'M'}})
        p4.evaluate('A.adm()')
        wait(p4, "document.querySelector('#sh') && !document.querySelector('#sh').innerText.includes('Cargando')", 15000)
        txt = p4.inner_text('#sh')
        check('Administración lista las cuentas', 'Ana_1' in txt and 'VictorAdmin_' in txt, txt[:300])
        check('un usuario con código se ve como texto (nada se ejecuta)', p4.evaluate("!document.querySelector('#sh img') && document.querySelector('#sh').innerText.includes('<img src=x')"))
        check('la contraseña temporal sale oculta hasta pulsar «Ver»', temp not in txt and 'Ana_1' in txt)
        p4.click('#sh [data-a=adv]')
        check('«Ver» la enseña', temp in p4.inner_text('#sh'))

        # ── entrar con la contraseña temporal (en un móvil nuevo): hay que elegir una nueva ──
        n_logs = p2.evaluate('S.logs.length')
        c5, p5 = device()
        login(p5, 'Ana_1', temp, wait_app=False)
        wait(p5, "document.getElementById('lgw') && document.getElementById('lgw').innerText.toLowerCase().includes('contraseña nueva')", 15000)
        check('al entrar con la temporal, hay que elegir una nueva antes de nada', p5.evaluate("account.mc==1 && document.querySelector('nav').style.display=='none'"))
        p5.fill('#lgp', 'nueva-clave-9'); p5.fill('#lgp2', 'nueva-clave-9')
        p5.click('[data-a=lgcp]')
        wait(p5, "window.__ffok && !document.getElementById('lgw')", 20000)
        check('con la nueva, entra con sus datos', p5.evaluate('S.logs.length') == n_logs and sync(p5) == 'ok', str(p5.evaluate('S.logs.length')))
        check('y el perfil ya no pide cambiarla', (fb.data('users/' + uid) or {}).get('mc') is False)
        c5.close()
        # ── la sesión abierta en el móvil 2 caduca: se vuelve a entrar sin perder lo del móvil (con el emulador, si caduca: el
        #    emulador no siempre invalida los tokens como Firebase) ──
        p2.reload()
        wait(p2, 'window.__ffok')
        st = sync(p2)
        if not EMU:
            check('tras cambiar la contraseña, la sesión del otro móvil caduca y lo avisa', st == 'dead' and p2.evaluate("!!document.querySelector('#dg [data-v=lgre]')"), st)
        if st == 'dead':
            wait(p2, "!!document.querySelector('#dg [data-v=lgre]')")
            p2.evaluate("document.querySelector('#dg [data-v=lgre]').click()")
            p2.fill('#lrp', 'nueva-clave-9')
            p2.click('[data-a=lgrs]')
            wait(p2, "!document.querySelector('#sh #lrp')", 15000)
            check('al volver a entrar, sigue con sus datos y sincroniza', p2.evaluate('S.logs.length') == n_logs and sync(p2) == 'ok')
        p4.evaluate("document.querySelector('#sh [data-a=adx]').click()")
        p4.evaluate("document.querySelector('#dg [data-v=adxx]').click()")
        p4.wait_for_timeout(800)
        check('«Entregada» la borra de Administración', temp not in p4.inner_text('#sh'))
        c4.close()

        # ── borrar todos los datos: también en la nube ──
        fb.set_offline(c2, True)
        p2.evaluate('A.zrs()')
        p2.wait_for_timeout(500)
        check('sin conexión no se borra nada (si no, volverían de la nube)', p2.evaluate('S.logs.length') == 2 and fb.data('users/%s/data/index' % uid) is not None)
        fb.set_offline(c2, False)
        p2.evaluate("localStorage.setItem('ffw',JSON.stringify({W:{x:[]},t:Date.now()}))")
        with p2.expect_navigation(timeout=20000):
            p2.evaluate('A.zrs()')
        wait(p2, 'window.__ffok')
        check('con conexión se borran del móvil (también el entreno en curso) y de la nube; el usuario se queda', p2.evaluate("S.logs.length==0 && !localStorage.getItem('ffw')") and fb.data('users/%s/data/index' % uid) is None and fb.data('users/%s/logs/2026' % uid) is None and (fb.data('users/' + uid) or {}).get('u') == 'Ana_1')
        sync(p2)
        check('y la cuenta sigue sincronizando, vacía', p2.evaluate('syncState().st') == 'ok' and fb.data('users/%s/data/index' % uid) is not None)

        csp = [x for pg in (p1, p2) for x in (pg.evaluate('window.__csp||[]') or [])]
        check('sin choques con la política de seguridad (CSP)', not csp, str(csp[:3]))
        check('sin errores de JS', not errs, '\n'.join(errs[:8]))
        b.close()
    print('\n%d correctas, %d fallos' % (len(passes), len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'stratafit.html'))
