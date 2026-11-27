"""Prueba de la cuenta y la nube (M2 y M5): inicio de sesión y registro, sincronización entre dos móviles (también sin conexión y
con cambios en los dos, sin poder guardar en el móvil y con la app abierta dos veces), cerrar sesión, espera tras fallos, Administración, contraseña temporal, fallos y sugerencias (enviar,
sin conexión, vista, respuesta y arreglado), copia de seguridad en la nube (a mano, semanal, sin pisar una copia con más datos,
restaurar), foto con consentimiento, borrar todos los datos y seguridad (sin código inyectado ni choques con la CSP).
Y lo de la V1.0.4: las dos casillas de crear la cuenta y lo aceptado anotado en su perfil, la pantalla de la aceptación de una
cuenta que no tiene nada aceptado (en dos móviles), el contacto de privacidad, retirar el consentimiento, «Eliminar cuenta»
(contraseña que no es, un borrado que falla a medias, y entera) y, con el emulador, la limpieza periódica
(tools/admin/limpieza.mjs): los restos de una cuenta eliminada y las cuentas con dos años sin actividad.

  python3 tests/cloud.py dist/stratafit.html                          (Firebase de prueba en memoria: tests/fakefb.py)
  SF_CLOUD=emulador python3 tests/cloud.py dist/emu/stratafit.html    (emulador de Firebase, con firestore.rules; en la CI)
Con el emulador, la contraseña temporal la crea el script de verdad (tools/admin/contrasena.mjs, con firebase-admin).
"""
# las colecciones de cada cuenta, bajo users/{uid} (firestore.rules)
OWN = ('data', 'logs', 'hist', 'meals', 'private', 'backup')
import os, re, sys, json, time, base64, subprocess, urllib.request
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts, RECAPTCHA, recaptcha_route
from fakefb import FakeFirebase, DOMAIN, OLD_DOMAIN

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


LAST = ['']  # la última comprobación, para saber dónde pasó un error de la página


def check(name, cond, info=''):
    LAST[0] = name
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

    def _account(self, user):
        """La cuenta de un usuario, esté en el dominio de ahora o en el anterior."""
        for d in (DOMAIN, OLD_DOMAIN):
            r = self._req('%s/identitytoolkit.googleapis.com/v1/projects/%s/accounts:lookup' % (self.AUTH, self.P), {'email': [user.lower() + '@' + d]})
            if r.get('users'):
                return r['users'][0]
        raise KeyError(user)

    def uid_of(self, user):
        return self._account(user)['localId']

    def domain_of(self, user):
        return self._account(user)['email'].split('@')[1]

    def to_old_domain(self, user):
        """Deja la cuenta como las de antes de la V1.0.32, con el dominio anterior: una que aún no se ha pasado."""
        self._req('%s/identitytoolkit.googleapis.com/v1/projects/%s/accounts:update' % (self.AUTH, self.P),
                  {'localId': self.uid_of(user), 'email': user.lower() + '@' + OLD_DOMAIN})

    def _tool(self, *args):
        """Un script de administración de verdad (tools/admin, con firebase-admin) contra el emulador: (código de salida, salida)."""
        env = dict(os.environ, FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099', FIRESTORE_EMULATOR_HOST='127.0.0.1:8080')
        r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'admin', args[0])] + list(args[1:]), env=env, capture_output=True, text=True, timeout=120)
        return r.returncode, r.stdout + r.stderr

    def tool_finds(self, user):
        """¿Encuentran la cuenta los scripts de administración? («Asignar rol», que la deja como estaba: usuario)."""
        return self._tool('rol.mjs', user, 'usuario')[0] == 0

    def dry_run(self):
        """El simulacro de pasar las cuentas: (¿ha ido bien?, cuántas dice que quedan por pasar, ¿dice que las sesiones
        abiertas se conservan?)."""
        code, out = self._tool('dominio.mjs', 'simulacro')
        m = re.search(r'Por pasar \| (\d+)', out)
        return code == 0, int(m.group(1)) if m else -1, bool(re.search(r'Las sesiones abiertas se conservan \| Sí', out))

    def move_accounts(self, keep=True):
        """Pasa las cuentas con el script de verdad (tools/admin/dominio.mjs): «aplicar», que solo las pasa si las sesiones se
        conservan, o, sin `keep`, «aplicar-todo». Devuelve cuántas ha pasado."""
        code, out = self._tool('dominio.mjs', 'aplicar' if keep else 'aplicar-todo')
        if code:
            raise RuntimeError(out)
        m = re.search(r'Pasadas ahora \| (\d+)', out)
        if not m:
            raise RuntimeError('tools/admin/dominio.mjs no dice cuántas cuentas ha pasado:\n' + out)
        return int(m.group(1))

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

    def delete(self, path):
        self._req('%s/v1/projects/%s/databases/(default)/documents/%s' % (self.FS, self.P, path), method='DELETE')

    def _list(self, coll):
        """Los documentos de una colección: [(ruta, campos)]."""
        base = '%s/v1/projects/%s/databases/(default)/documents/' % (self.FS, self.P)
        docs = self._req(base + coll + '?pageSize=300').get('documents', [])
        return [(d['name'].split('/documents/')[1], d.get('fields', {})) for d in docs]

    def tree(self, uid):
        """Todo lo que la cuenta `uid` tiene en Firestore: su perfil, sus documentos y sus avisos (rutas, ordenadas)."""
        out = ['users/' + uid] if self.data('users/' + uid) is not None else []
        for c in OWN:
            out += [p for p, _ in self._list('users/%s/%s' % (uid, c))]
        out += [p for p, f in self._list('reports') if f.get('uid', {}).get('stringValue') == uid]
        return sorted(out)

    def has_account(self, user):
        try:
            self._account(user)
            return True
        except KeyError:
            return False

    def strip_consent(self, uid):
        """Deja el perfil como el de una cuenta anterior a la V1.0.4: sin nada aceptado."""
        self._req('%s/v1/projects/%s/databases/(default)/documents/users/%s?updateMask.fieldPaths=cs' % (self.FS, self.P, uid), {'fields': {}}, 'PATCH')

    def set_terms(self, uid, v, at):
        """Deja en el perfil las condiciones aceptadas con la versión `v` en el momento `at` (ms), como lo dejaría otro
        dispositivo de la cuenta."""
        self._req('%s/v1/projects/%s/databases/(default)/documents/users/%s?updateMask.fieldPaths=cs.t' % (self.FS, self.P, uid),
                  {'fields': {'cs': {'mapValue': {'fields': {'t': {'mapValue': {'fields': {'v': {'stringValue': v}, 'at': {'integerValue': str(at)}}}}}}}}}, 'PATCH')

    def sweep(self, mode, days=0):
        """La limpieza periódica de verdad (tools/admin/limpieza.mjs), como si pasaran `days` días: (código de salida, salida)."""
        env = dict(os.environ, FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099', FIRESTORE_EMULATOR_HOST='127.0.0.1:8080', LIMPIEZA_AHORA=str(int((time.time() + days * 86400) * 1000)))
        r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'admin', 'limpieza.mjs'), mode], env=env, capture_output=True, text=True, timeout=180)
        return r.returncode, r.stdout + r.stderr

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

    def delete(self, path):
        self.docs.pop(path, None)

    def tree(self, uid):
        """Todo lo que la cuenta `uid` tiene en Firestore: su perfil, sus documentos y sus avisos (rutas, ordenadas)."""
        return sorted(k for k, d in self.docs.items() if k == 'users/' + uid or k.startswith('users/%s/' % uid)
                      or k.startswith('reports/') and d['fields'].get('uid', {}).get('stringValue') == uid)

    def has_account(self, user):
        try:
            self._email(user)
            return True
        except KeyError:
            return False

    def strip_consent(self, uid):
        """Deja el perfil como el de una cuenta anterior a la V1.0.4: sin nada aceptado."""
        self.docs['users/' + uid]['fields'].pop('cs', None)

    def set_terms(self, uid, v, at):
        """Deja en el perfil las condiciones aceptadas con la versión `v` en el momento `at` (ms), como lo dejaría otro
        dispositivo de la cuenta."""
        cs = self.docs['users/' + uid]['fields'].setdefault('cs', {'mapValue': {'fields': {}}})
        cs['mapValue']['fields']['t'] = {'mapValue': {'fields': {'v': {'stringValue': v}, 'at': {'integerValue': str(at)}}}}


def offline_noise(text):
    """¿Es el aviso del navegador de que una petición no llegó porque la prueba quitó la conexión? Cada motor lo dice a su manera:
    Chromium y WebKit, «Failed to load resource»; Firefox, «Cross-Origin Request Blocked … (Reason: CORS request did not succeed)»."""
    return 'ERR_INTERNET_DISCONNECTED' in text or 'Failed to load resource' in text or 'CORS request did not succeed' in text


def brief(text):
    """El principio y el final de un mensaje largo (en los de Firefox, el motivo va al final)."""
    return text if len(text) <= 300 else text[:160] + ' … ' + text[-130:]


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
            pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200] + ' (tras «%s»)' % LAST[0]))
            pg.on('console', lambda m: errs.append('CONSOLE ' + brief(m.text)) if m.type == 'error' and not offline_noise(m.text) else None)
            pg.goto(url)
            wait(pg, 'window.__ffok')
            return c, pg

        def tick(pg):
            """Marca las dos casillas: las de crear la cuenta o las de la pantalla de la aceptación."""
            pg.evaluate("for (const id of ['lgc1', 'lgc2']) { const e = document.getElementById(id); if (!e.checked) e.click(); }")

        def login(pg, user, pw, new=False, wait_app=True):
            if new:
                pg.click('[data-a=loginMode][data-v=up]')
            pg.fill('#lgu', user)
            pg.fill('#lgp', pw)
            if new:
                pg.fill('#lgp2', pw)
                tick(pg)
            pg.click('[data-a=loginSubmit]')
            if wait_app:
                wait(pg, "window.__ffok && !document.getElementById('lgw') && document.querySelector('nav').style.display!='none'", 20000)

        def new_account_bio(pg, sex):
            """Bienvenida de una cuenta nueva: «Siguiente», los seis datos y «Guardar y continuar»."""
            pg.click('#wlc [data-a=welcomeNext]')
            pg.click('#wlc [data-a=welcomeSex][data-v=%s]' % sex)
            for k, v in (('age', '31'), ('h', '168'), ('w', '62')):
                pg.fill('#wl_' + k, v)
            pg.select_option('#wl_act', '1')
            pg.select_option('#wl_goal', '1')
            pg.click('#wlc [data-a=welcomeSave]')
            wait(pg, "!document.getElementById('wlc') && !!document.querySelector('#tour .tour-step')")

        def sync(pg):
            pg.evaluate('syncNow()')
            return pg.evaluate('syncState().st')

        def close(c, pg):
            """Cierra un móvil sin una sincronización a medias (la que estaba programada ya no se hace): WebKit cuenta como
            error de la página una petición cortada al cerrar."""
            try:
                pg.evaluate('stopSync()')
                wait(pg, "syncState().st!='run'", 10000)
            except Exception:
                pass
            c.close()

        today = '2026-11-04'
        arroz = {'n': 'Arroz', 'g': 150, 'b': [130, 28, 2.7, 0.3, 0, 0]}
        pollo = {'n': 'Pollo', 'g': 180, 'b': [165, 0, 31, 3.6, 0, 0]}
        pan = {'n': 'Pan', 'g': 50, 'b': [260, 50, 9, 3, 3, 1]}

        # ── un móvil sin cuenta: solo el inicio de sesión ──
        c1, p1 = device()
        check('sin sesión, solo el inicio de sesión (sin la barra de pestañas)', p1.evaluate("!!document.getElementById('lgw') && document.querySelector('nav').style.display=='none'"))
        check('el inicio de sesión lleva el logo (F-40)', p1.evaluate("(i=>!!i&&i.alt=='StrataFit'&&i.complete&&i.naturalWidth==288)(document.querySelector('#lgw img.brand-logo'))"))
        check('sin datos personales en el registro: solo usuario y contraseña, y las dos casillas de la aceptación, sin marcar',
              p1.evaluate("(A.loginMode(0,{dataset:{v:'up'}}),[...document.querySelectorAll('#lgw input')].map(i=>i.id+(i.checked?'*':'')).join())") == 'lgu,lgp,lgp2,lgc1,lgc2')
        p1.fill('#lgu', 'Ana_1'); p1.fill('#lgp', 'contraseña-1'); p1.fill('#lgp2', 'otra-cosa')
        p1.click('[data-a=loginSubmit]')
        check('contraseñas que no coinciden: aviso y no se crea nada', 'no coinciden' in p1.inner_text('#lge'))
        p1.fill('#lgu', 'a..b')
        p1.click('[data-a=loginSubmit]')
        check('usuario no válido: aviso', 'punto' in p1.inner_text('#lge'))
        # sin marcar las casillas no se crea la cuenta: ni sin las dos ni con una sola
        p1.fill('#lgu', 'Ana_1'); p1.fill('#lgp2', 'contraseña-1')
        p1.click('[data-a=loginSubmit]')
        check('sin aceptar las condiciones no se crea la cuenta', '16 años' in p1.inner_text('#lge') and not fb.has_account('Ana_1'), p1.inner_text('#lge'))
        p1.evaluate("document.getElementById('lgc1').click()")
        p1.click('[data-a=loginSubmit]')
        check('ni sin el consentimiento para los datos de salud', 'consentimiento' in p1.inner_text('#lge') and not fb.has_account('Ana_1'), p1.inner_text('#lge'))
        p1.evaluate("document.getElementById('lgc1').click()")
        p1.evaluate("A.loginMode(0,{dataset:{v:'in'}})")
        login(p1, 'Ana_1', 'contraseña-1', new=True)
        uid = fb.uid_of('Ana_1')
        prof = fb.data('users/' + uid) or {}
        check('al crear la cuenta se crea su perfil con el usuario (y nada personal)', prof.get('u') == 'Ana_1' and set(prof) <= {'u', 'sx', 'pr', 'ca', 'm', 'os', 'cs'}, str(prof))
        cs = prof.get('cs') or {}
        check('y en él queda anotado lo aceptado: la versión de las condiciones y la del consentimiento, con su momento',
              set(cs) == {'t', 'h'} and cs['t'].get('v') == '1.0' and cs['h'].get('v') == '1.0' and cs['h'].get('st') == 1 and abs(cs['t'].get('at', 0) - time.time() * 1000) < 300000 and cs['t'].get('at') == cs['h'].get('at'), str(cs))
        check('en el móvil ya no queda nada por subir de lo aceptado', p1.evaluate("account.cs.h.st === 1 && !account.csu"), str(p1.evaluate('account.cs')))
        check('y se suben el índice y el núcleo', fb.data('users/%s/data/index' % uid) is not None and fb.part('users/%s/data/core' % uid) is not None)
        check('Perfil enseña el usuario', 'Ana_1' in p1.inner_text('#app') or p1.evaluate("(S.tab=3,R(),document.querySelector('.profile-name').textContent)") == 'Ana_1')
        check('la cuenta nueva se crea con el dominio de ahora (el del proyecto de Firebase)', fb.domain_of('Ana_1') == DOMAIN, fb.domain_of('Ana_1'))
        check('el correo técnico no aparece en la app', '@' + DOMAIN not in p1.content() and '@' + OLD_DOMAIN not in p1.content())

        # ── cuenta nueva (I-23, I-24): sin programa y, tras la primera sincronización, la bienvenida con sus datos; después, el
        #    recorrido de la primera vez (F-36). Visto en un móvil, no vuelve a salir en otro ──
        check('la cuenta nueva empieza sin programa: «Seleccionar programa»', p1.evaluate("S.noProgram===1 && S.plan.every(d=>!d.ex.length) && (S.tab=0,R(),!!document.querySelector('#app .no-program-card'))"))
        wait(p1, "!!document.getElementById('wlc')", 30000)
        check('cuenta nueva: tras la primera sincronización sale la bienvenida', 'Gracias por instalar la app' in p1.inner_text('#wlc') and p1.evaluate("!document.getElementById('tour')"))
        new_account_bio(p1, 'F')
        check('con los datos guardados, el recorrido empieza por su primer paso', p1.evaluate("document.querySelector('#tour .tour-step').textContent") == 'Paso 1 de 5' and p1.evaluate('S.welcomePending') is None)
        p1.click('#tour [data-a=tourSkip]')
        check('«Omitir» lo da por visto', p1.evaluate("!document.getElementById('tour') && S.tourSeen") == 1)
        sync(p1)
        prof = fb.data('users/' + uid) or {}
        core = fb.part('users/%s/data/core' % uid) or {}
        check('y queda en las preferencias del perfil de la cuenta, con el sexo elegido', prof.get('pr', {}).get('tour') == 1 and prof.get('sx') == 'F', str(prof))
        check('el perfil guarda el sistema del móvil, a efectos estadísticos (T-28; en estas pruebas, ni iPhone ni Android: «otro»)', prof.get('os') == 'otro', str(prof))
        check('en la nube, ya sin la bienvenida pendiente y aún sin programa', 'nw' not in core and core.get('np') == 1 and core.get('bio', {}).get('h') == '168', str({k: core.get(k) for k in ('nw', 'np', 'bio')}))
        check('en la nube, con las claves guardadas de siempre (core/schema), no con los nombres del programa', 'wk' in core and 'plan' in core and not any(k in core for k in ('week', 'noProgram', 'biometrics')) and 'theme' in (prof.get('pr') or {}) and 'accent' not in (prof.get('pr') or {}), str(sorted(core))[:200])

        # ── datos en el móvil 1 → la nube ──
        p1.evaluate("S.logs.push({d:'%s',n:'Pecho',v:4000,s:16,m:55,q:7});S.meals['%s']={0:[%s]};saveState()" % (today, today, json.dumps(arroz)))
        st = sync(p1)
        logs = fb.part('users/%s/logs/2026' % uid) or []
        meals = fb.part('users/%s/meals/2026-11' % uid) or {}
        check('un entreno y una comida se suben (con su id)', st == 'ok' and len(logs) == 1 and logs[0].get('id') and meals.get(today, {}).get('0') == [arroz], '%s %s %s' % (st, logs, meals))

        # ── móvil 2: la misma cuenta baja los datos ──
        c2, p2 = device()
        login(p2, 'ana_1', 'contraseña-1')
        p2.wait_for_timeout(6000)
        check('en otro móvil de la misma cuenta, el recorrido ya no sale', p2.evaluate("!document.getElementById('tour') && S.tourSeen") == 1)
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
        # cloud/sync recuerda la huella de cada elemento con su texto: un cambio hecho en su sitio (sin cambiar el objeto) se
        # nota igual, y deshacerlo deja otra vez nada pendiente
        changed = p1.evaluate("(()=>{const l=S.logs[0];l.v+=1;const a=pendingDocs();l.v-=1;return [a,pendingDocs()]})()")
        check('un entreno cambiado en su sitio cuenta como pendiente, y al dejarlo como estaba, ya no', changed == [1, 0], str(changed))

        # ── preferencias: van en el perfil y pasan al otro móvil al abrir la app ──
        p2.evaluate("S.theme='light';S.accent=-1;S.accentColor='#ff2d55';S.reduceMotion=1;saveState()")
        sync(p2)
        pr = (fb.data('users/' + uid) or {}).get('pr', {})
        check('las preferencias van en el perfil (también el color propio y reducir animaciones)', pr.get('theme') == 'light' and pr.get('acc') == -1 and pr.get('acx') == '#ff2d55' and pr.get('rm') == 1, str(pr))
        p1.reload()
        wait(p1, 'window.__ffok')
        sync(p1)
        check('y el otro móvil las aplica', p1.evaluate("S.theme") == 'light' and p1.evaluate("document.documentElement.dataset.theme") == 'light' and p1.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--a2').trim()") == '#ff2d55' and p1.evaluate("document.documentElement.classList.contains('reduce-motion')"))

        # ── borrar en un móvil y sin tocar en el otro ──
        p2.evaluate("S.logs=S.logs.filter(l=>l.n!='Espalda');saveState()")
        sync(p2)
        sync(p1)
        check('un entreno borrado en un móvil se borra en el otro', sorted(p1.evaluate('S.logs.map(l=>l.n)')) == ['Pecho', 'Pierna'])

        # ── el índice nombra un documento que ya no existe (un borrado de la nube a medias: I-11) ──
        # el móvil 1 cambia las comidas (el índice sube de versión) y, antes de que el móvil 2 las baje, el documento desaparece
        mpath = 'users/%s/meals/2026-11' % uid
        p1.evaluate("S.water=Object.assign(S.water||{},{'%s':500});S.meals['%s'][1].push(%s);saveState()" % (today, today, json.dumps(pollo)))
        sync(p1)
        fb.delete(mpath)
        sync(p2)
        idx = (fb.data('users/%s/data/index' % uid) or {}).get('p', {})
        check('al sincronizar, el índice deja de nombrar lo que ya no existe y lo del móvil se vuelve a subir, sin perder nada (I-11)', 'meals:2026-11' in idx and fb.part(mpath) is not None and p2.evaluate("S.meals['%s'][0].length" % today) == 2, str([sorted(idx), fb.part(mpath) is not None]))
        asked = []
        note = lambda r: asked.append(r.url) if ':batchGet' in r.url else None
        p2.on('request', note)
        sync(p2)
        p2.remove_listener('request', note)
        check('y la siguiente sincronización ya no pide documentos de más', not asked, str(asked[:3]))
        sync(p1)

        # ── datos dañados en el móvil: lo que se vació no es un borrado; se vuelve a bajar de la nube (core/persist, I-04) ──
        idb_put = "(([k,v])=>savesDone().then(()=>new Promise((res,rej)=>{const r=indexedDB.open('ffdata',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('parts','readwrite'),st=tx.objectStore('parts');v===null?st.delete(k):st.put(v,k);tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>rej(tx.error)}})))"
        lpath = 'users/%s/logs/2026' % uid
        sync(p2)
        p2.evaluate(idb_put, ['ff:logs', '{roto'])
        p2.reload()
        wait(p2, 'window.__ffok')
        check('(preparado: los entrenos de este móvil, dañados)', p2.evaluate('stateRecovered') == 2 and p2.evaluate('S.logs.length') == 0)
        sync(p2)
        check('los entrenos dañados se vuelven a bajar de la nube, sin borrarlos allí', sorted(p2.evaluate('S.logs.map(l=>l.n)')) == ['Pecho', 'Pierna'] and len(fb.part(lpath) or []) == 2, str([p2.evaluate('S.logs.length'), len(fb.part(lpath) or [])]))
        p2.evaluate("document.querySelector('#dg').innerHTML=''")

        # ── una parte que falta (IndexedDB borrada a medias): ni se guarda ni se sincroniza; «Bajar de mi cuenta» lo recupera ──
        p2.evaluate(idb_put, ['ff:logs', None])
        p2.reload()
        wait(p2, 'window.__ffok')
        check('si faltan datos del móvil, avisa y no sincroniza', p2.evaluate('partsLost') == 1 and p2.evaluate("!!document.querySelector('#dg [data-v=partsFromCloudAsk]')") and p2.evaluate('!Store.remote'))
        sync(p2)
        check('y la nube no pierde nada aunque se pida sincronizar', len(fb.part(lpath) or []) == 2)
        p2.evaluate("document.querySelector('#dg [data-v=partsFromCloudAsk]').click()")
        check('«Bajar de mi cuenta» pide confirmación', p2.evaluate("!!document.querySelector('#dg [data-v=partsFromCloud]')"))
        # (la acción del botón, sin cerrar el aviso con el historial: esa navegación de la misma página confundiría a la espera)
        with p2.expect_navigation(timeout=20000):
            p2.evaluate("A.partsFromCloud()")
        wait(p2, 'window.__ffok')
        wait(p2, 'S.logs.length==2', 20000)
        check('«Bajar de mi cuenta» vuelve a bajar los datos de la cuenta', sorted(p2.evaluate('S.logs.map(l=>l.n)')) == ['Pecho', 'Pierna'] and not p2.evaluate('partsLost') and len(fb.part(lpath) or []) == 2)
        sync(p2)

        # ── el móvil no puede guardar (sin espacio), pero la sincronización sí funciona: lo que el móvil no tiene guardado no se
        #    apunta como sincronizado, así que al volver a abrir la app baja de la nube en vez de borrarse de ella (core/persist:
        #    savesBroken; cloud/sync: saveMeta) ──
        no_space = "window.__put=window.__put||IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('sin espacio','QuotaExceededError')};0"
        base_r = "((JSON.parse(localStorage.getItem('ffsync')||'{}').base||{})['logs:2026']||{}).r"
        names = lambda pg: sorted(pg.evaluate('S.logs.map(l=>l.n)'))
        cloud = lambda: sorted(l['n'] for l in fb.part(lpath) or [])
        one = lambda day, n: "S.logs.push({d:'2026-11-%02d',n:'%s',v:3000,s:12,m:40,q:7});saveState('logs')" % (day, n)
        r0 = p2.evaluate(base_r)
        p2.evaluate(no_space)
        p2.evaluate(one(7, 'Hombro'))
        wait(p2, 'savesBroken()')
        check('si el móvil no puede guardar, lo dice', 'No se ha podido guardar' in p2.inner_text('#tt'), p2.inner_text('#tt'))
        st = sync(p2)
        check('lo que el móvil no ha podido guardar sube igual a la nube', st == 'ok' and cloud() == ['Hombro', 'Pecho', 'Pierna'], '%s %s' % (st, cloud()))
        check('pero no se apunta como sincronizado, porque el móvil no lo tiene guardado', bool(r0) and p2.evaluate(base_r) == r0, '%s %s' % (r0, p2.evaluate(base_r)))
        p2.reload()
        wait(p2, 'window.__ffok')
        check('(al volver a abrir la app, al móvil le falta lo que no pudo guardar)', names(p2) == ['Pecho', 'Pierna'] and not p2.evaluate('savesBroken()'), str(names(p2)))
        st = sync(p2)
        check('y lo baja de la nube, en vez de borrarlo de ella', st == 'ok' and names(p2) == ['Hombro', 'Pecho', 'Pierna'] and cloud() == ['Hombro', 'Pecho', 'Pierna'], '%s %s %s' % (st, names(p2), cloud()))
        # lo que baja de la nube y el móvil no puede guardar tampoco se apunta como bajado: se baja otra vez
        sync(p1)
        p1.evaluate(one(8, 'Brazos'))
        sync(p1)
        r1 = p2.evaluate(base_r)
        p2.evaluate(no_space)
        st = sync(p2)
        check('lo que baja de la nube sin poder guardarlo se ve en la app, pero no se apunta como bajado', st == 'ok' and names(p2) == ['Brazos', 'Hombro', 'Pecho', 'Pierna'] and p2.evaluate('savesBroken()') and r1 != r0 and p2.evaluate(base_r) == r1, '%s %s %s' % (st, names(p2), [r0, r1, p2.evaluate(base_r)]))
        p2.reload()
        wait(p2, 'window.__ffok')
        st = sync(p2)
        check('al volver a abrir, se baja otra vez y la nube no pierde nada', st == 'ok' and names(p2) == ['Brazos', 'Hombro', 'Pecho', 'Pierna'] and cloud() == ['Brazos', 'Hombro', 'Pecho', 'Pierna'], '%s %s %s' % (st, names(p2), cloud()))
        # y si vuelve a haber sitio sin cerrar la app, el siguiente guardado lo escribe todo y lo sincronizado se apunta
        r2 = p2.evaluate(base_r)
        p2.evaluate(no_space)
        p2.evaluate(one(9, 'Core'))
        wait(p2, 'savesBroken()')
        p2.evaluate("IDBObjectStore.prototype.put=window.__put;saveState();0")
        wait(p2, '!savesBroken()')
        st = sync(p2)
        saved = sorted(l['n'] for l in p2.evaluate("savesDone().then(()=>__stored()).then(s=>s.logs)"))
        check('cuando vuelve a poder guardar, queda todo guardado, subido y apuntado', st == 'ok' and saved == ['Brazos', 'Core', 'Hombro', 'Pecho', 'Pierna'] and cloud() == saved and p2.evaluate(base_r) not in (None, r2), '%s %s %s' % (st, saved, cloud()))
        p2.reload()
        wait(p2, 'window.__ffok')
        st = sync(p2)
        check('y al volver a abrir sigue todo, en el móvil y en la nube', st == 'ok' and names(p2) == saved and cloud() == saved, '%s %s %s' % (st, names(p2), cloud()))
        # lo que bajó sin poder guardarse queda apuntado como sincronizado en cuanto el móvil vuelve a guardar. Si no, al borrarlo
        # después sin conexión parecería algo que este móvil nunca tuvo, y volvería de la nube (lo encontró tests/syncfuzz.py)
        p1.evaluate(one(12, 'Abdomen'))
        sync(p1)
        p2.evaluate(no_space)
        sync(p2)
        noted = "(id=>id!=null&&id in ((JSON.parse(localStorage.getItem('ffsync')||'{}').base||{})['logs:2026']||{h:{}}).h)((S.logs.find(l=>l.n=='Abdomen')||{}).id)"
        check('(preparado: un entreno bajado de la nube que el móvil no ha podido guardar ni apuntar)', 'Abdomen' in names(p2) and p2.evaluate('savesBroken()') and not p2.evaluate(noted))
        p2.evaluate("IDBObjectStore.prototype.put=window.__put;saveState();0")
        wait(p2, '!savesBroken()')
        check('al volver a poder guardar, lo bajado queda guardado y apuntado como sincronizado', p2.evaluate(noted) and 'Abdomen' in [l['n'] for l in p2.evaluate("savesDone().then(()=>__stored()).then(s=>s.logs)")])
        # (sin conexión solo mientras se borra: con el emulador, sin conexión tampoco se puede recargar la página. La app deja de
        # sincronizar antes de que vuelva la red, para que no suba el borrado ella sola antes de cerrarse)
        fb.set_offline(c2, True)
        p2.evaluate("S.logs=S.logs.filter(l=>l.n!='Abdomen');saveState('logs')")
        p2.evaluate('savesDone()')
        p2.evaluate('stopSync()')
        fb.set_offline(c2, False)
        p2.reload()
        wait(p2, 'window.__ffok')
        st = sync(p2)
        sync(p1)
        check('y si después se borra sin conexión, sigue borrado al sincronizar, en los dos móviles y en la nube', st == 'ok' and names(p2) == saved and cloud() == saved and names(p1) == saved, '%s %s %s %s' % (st, names(p2), cloud(), names(p1)))
        # Y eso, sin adelantarse: si en ese momento hay una sincronización a medias que acaba de bajar algo, lo sincronizado no se
        # apunta hasta que eso también está escrito. Si se apuntara antes y el móvil dejara de poder guardar justo entonces, al
        # volver a abrir la app faltaría lo bajado, constaría como sincronizado, y se borraría de la nube. Aquí el guardado con
        # el que el móvil vuelve a guardar tarda (su transacción se retiene abierta) mientras baja un entreno nuevo, y el sitio
        # se acaba en cuanto se apunta lo sincronizado
        p1.evaluate(one(13, 'Glúteo'))
        sync(p1)
        p2.evaluate(no_space)
        sync(p2)
        p1.evaluate(one(14, 'Antebrazo'))
        sync(p1)
        check('(preparado: el móvil sin poder guardar, con lo sincronizado esperando a apuntarse, y algo nuevo en la nube)', 'Glúteo' in names(p2) and p2.evaluate('savesBroken()') and 'Antebrazo' in cloud() and 'Antebrazo' not in names(p2))
        p2.evaluate("""window.__commit=window.__commit||IDBTransaction.prototype.commit;window.__si=window.__si||Storage.prototype.setItem;window.__hold=1;
          IDBTransaction.prototype.commit=function(){};
          IDBObjectStore.prototype.put=function(){const st=this,r=window.__put.apply(this,arguments),keep=()=>{try{if(window.__hold)st.get('__').onsuccess=keep}catch(e){}};keep();return r};0""")
        p2.evaluate("saveState();0")
        p2.evaluate("syncNow();0")
        wait(p2, "S.logs.some(l=>l.n=='Antebrazo')")
        p2.evaluate("Storage.prototype.setItem=function(k){const r=window.__si.apply(this,arguments);if(k=='ffsync')IDBObjectStore.prototype.put=function(){throw new DOMException('sin espacio','QuotaExceededError')};return r};window.__hold=0;0")
        wait(p2, "syncState().st!='run'")
        p2.evaluate('savesDone()')
        p2.reload()
        wait(p2, 'window.__ffok')
        st = sync(p2)
        sync(p1)
        saved = sorted(saved + ['Antebrazo', 'Glúteo'])
        check('lo sincronizado no se apunta antes de que lo recién bajado esté escrito: nada se borra de la nube', st == 'ok' and names(p2) == saved and cloud() == saved and names(p1) == saved, '%s %s %s %s' % (st, names(p2), cloud(), names(p1)))
        # Y lo que sube tampoco se apunta hasta que el móvil ha terminado de guardarlo. Aquí el guardado del entreno sigue a
        # medias (su transacción se retiene abierta) mientras el entreno sube, y al final falla
        p2.evaluate("""window.__hold=1;IDBTransaction.prototype.commit=function(){};
          IDBObjectStore.prototype.put=function(){const st=this,tx=st.transaction,keep=()=>{try{if(window.__hold)st.get('__').onsuccess=keep;else tx.abort()}catch(e){}};
            const r=st.get('__');r.onsuccess=keep;return r};0""")
        p2.evaluate(one(15, 'Trapecio'))
        p2.evaluate("syncNow();0")
        for _ in range(100):
            if 'Trapecio' in cloud():
                break
            p2.wait_for_timeout(100)
        p2.wait_for_timeout(300)
        p2.evaluate("window.__hold=0;0")
        wait(p2, "syncState().st!='run'")
        p2.evaluate('savesDone()')
        check('(preparado: el entreno ha subido con su guardado a medias, que al final ha fallado)', 'Trapecio' in cloud() and p2.evaluate('savesBroken()'), str(cloud()))
        p2.reload()
        wait(p2, 'window.__ffok')
        st = sync(p2)
        sync(p1)
        saved = sorted(saved + ['Trapecio'])
        check('lo subido no se apunta hasta que el móvil termina de guardarlo: al volver a abrir, baja de la nube en vez de borrarse', st == 'ok' and names(p2) == saved and cloud() == saved and names(p1) == saved, '%s %s %s %s' % (st, names(p2), cloud(), names(p1)))

        # ── la app abierta dos veces en el mismo móvil (dos pestañas): la que se queda atrás ni guarda ni sincroniza, así que no
        #    borra de la nube lo que guardó la otra (core/persist: instanceStale; lo del propio móvil, en tests/storage.py) ──
        # (antes, que la app haya guardado lo que guarda sola al arrancar con datos nuevos, como un logro: unos 2,5 s después)
        sync(p1)
        p1.reload()
        wait(p1, 'window.__ffok')
        p1.wait_for_timeout(3200)
        sync(p1)
        q1 = c1.new_page()
        q1.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200] + ' (tras «%s»)' % LAST[0]))
        q1.on('console', lambda m: errs.append('CONSOLE ' + brief(m.text)) if m.type == 'error' and not offline_noise(m.text) else None)
        q1.goto(url)
        wait(q1, 'window.__ffok')
        wait(q1, "syncState().st=='ok'")
        q1.wait_for_timeout(3200)
        check('(preparado: la misma cuenta, abierta en dos pestañas del mismo móvil)', q1.evaluate('account.u') == 'Ana_1' and names(q1) == saved and not p1.evaluate('instanceStale') and not q1.evaluate('instanceStale'), str([names(q1), p1.evaluate('instanceStale'), q1.evaluate('instanceStale')]))
        p1.evaluate(one(10, 'Gemelo'))
        st = sync(p1)
        wait(q1, 'instanceStale')
        check('una pestaña guarda y sube un entreno; la otra se queda atrás y lo dice', st == 'ok' and 'Gemelo' in cloud() and 'abierta en otra ventana' in q1.inner_text('#dg'), '%s %s' % (st, cloud()))
        # la que se quedó atrás no tiene ese entreno: si guardara y sincronizara lo suyo, la nube lo daría por borrado
        meta0 = q1.evaluate("localStorage.getItem('ffsync')")
        q1.evaluate("S.logs=S.logs.filter(l=>l.n!='Pecho');" + one(11, 'Tibial'))
        sync(q1)
        q1.wait_for_timeout(300)
        check('la que se quedó atrás no sube lo suyo ni toca lo sincronizado: la nube no pierde nada', cloud() == sorted(saved + ['Gemelo']) and q1.evaluate("localStorage.getItem('ffsync')") == meta0 and sorted(l['n'] for l in p1.evaluate("savesDone().then(()=>__stored()).then(s=>s.logs)")) == sorted(saved + ['Gemelo']), str(cloud()))
        # (la acción del botón «Recargar», sin cerrar el aviso con el historial, como arriba)
        with q1.expect_navigation(timeout=20000):
            q1.evaluate("A.staleReload()")
        wait(q1, 'window.__ffok')
        st = sync(q1)
        check('recargada, tiene lo último, sincroniza y la nube sigue entera', st == 'ok' and names(q1) == sorted(saved + ['Gemelo']) and cloud() == sorted(saved + ['Gemelo']) and not q1.evaluate('instanceStale'), '%s %s %s' % (st, names(q1), cloud()))
        q1.close()
        # (se deja la cuenta como estaba, con sus dos entrenos, para lo que sigue)
        p1.evaluate("S.logs=S.logs.filter(l=>['Pecho','Pierna'].includes(l.n));saveState()")
        sync(p1)
        sync(p2)
        check('(y los entrenos de estas pruebas, borrados en los dos móviles y en la nube)', names(p1) == ['Pecho', 'Pierna'] and names(p2) == ['Pecho', 'Pierna'] and cloud() == ['Pecho', 'Pierna'] and not p1.evaluate('instanceStale'), str([names(p1), names(p2), cloud()]))

        # ── App Check (I-05): sin configurar no hace nada; configurado, cada petición a Firebase lleva su token, la CSP de la app
        #    admite reCAPTCHA y, si reCAPTCHA falla, tarda o no hay conexión, la app sigue sin token. reCAPTCHA (tests/browser.py) y
        #    el cambio de tokens (tests/fakefb.py) van simulados: los de verdad no se pueden usar fuera de la dirección de la app ──
        if not EMU:
            def phone(file):
                c = b.new_context(viewport={'width': 390, 'height': 844}, **context_opts(file))
                # (el <script> de reCAPTCHA se pide de verdad, para que pase por la CSP de la app, y lo contesta el de prueba)
                c.add_init_script('window.__sfNoSession=1;window.__sfNet=1;window.__sfRecaptchaNet=1;')
                c.add_init_script(INIT)
                c.route(RECAPTCHA, recaptcha_route)
                fb.install(c)
                pg = c.new_page()
                heads = []
                pg.on('request', lambda r: heads.append(r.headers.get('x-firebase-appcheck')) if re.match(r'https://(identitytoolkit|securetoken|firestore)\.googleapis\.com/', r.url) else None)
                pg.goto(app_url(file))
                wait(pg, 'window.__ffok')
                return c, pg, heads

            # ¿ha salido la pantalla «StrataFit no ha podido iniciarse» (index.html)? Tapa la app, que sigue funcionando debajo
            BROKE = "!!document.getElementById('ffe')"

            def noted(pg):
                """Lo que App Check ha anotado en Diagnóstico."""
                return [x['m'] for x in pg.evaluate('errorLog()') if x['w'] == 'App Check']

            # la compilación de siempre, mientras cloud/config no traiga las claves
            ca, pa, sent = phone(path)
            if pa.evaluate('appCheckOn()'):
                print('  (App Check está configurado en cloud/config: no se comprueba cómo va sin configurar)')
            else:
                quiet = 'reCAPTCHA' not in pa.inner_text('#lgw')
                login(pa, 'Ana_1', 'contraseña-1')
                sync(pa)
                check('sin configurar, App Check no hace nada: ni carga reCAPTCHA, ni lo menciona, ni envía nada',
                      quiet and not pa.evaluate("!!document.querySelector('script[src*=recaptcha]')") and len(sent) > 2 and all(h is None for h in sent), str(sent[:4]))
            close(ca, pa)

            # configurado: la compilación de prueba (python3 build.py --appcheck), con la CSP que llevará la app publicada
            acfile = os.path.join(os.path.dirname(os.path.abspath(path)), 'appcheck', 'stratafit.html')
            if not os.path.exists(acfile):
                check('está la compilación de prueba con App Check (python3 build.py --appcheck)', False, acfile)
            else:
                n0 = len(fb.exchanges)
                ca, pa, sent = phone(acfile)
                check('configurado, el inicio de sesión dice que se usa reCAPTCHA (su sello no se ve)', 'reCAPTCHA' in pa.inner_text('#lgw'))
                login(pa, 'Ana_1', 'contraseña-1')
                exch = fb.exchanges[n0:]
                check('al entrar, la petición a Authentication lleva el token de App Check', sent[:1] == ['ac-tok'], str(sent[:3]))
                check('que sale de reCAPTCHA Enterprise (con su clave) cambiado en App Check',
                      len(exch) >= 1 and ':exchangeRecaptchaEnterpriseToken?key=' in exch[0][0] and '/projects/' in exch[0][0] and '/apps/1:1234:web:abcd' in exch[0][0] and 'rc-tok' in exch[0][1], str(exch[:1]))
                # (entrar recarga la app: la página nueva pide su token en la primera petición)
                sync(pa)
                check('reCAPTCHA recibe la clave de sitio y la acción de App Check', pa.evaluate('window.__rc') == ['clave-de-prueba', 'fire_app_check'], str(pa.evaluate('window.__rc')))
                del sent[:]
                n = len(fb.exchanges)
                pa.evaluate("window.__rc=null")
                sync(pa)
                sync(pa)
                check('cada petición de la sincronización lo lleva', len(sent) >= 2 and all(h == 'ac-tok' for h in sent), str(sent[:8]))
                check('y el token se pide una sola vez por hora (no en cada petición)', len(fb.exchanges) == n and pa.evaluate('window.__rc') is None, str(len(fb.exchanges) - n))
                csp = pa.evaluate('window.__csp||[]')
                check('la CSP de la app admite reCAPTCHA (su código, su marco y sus avisos) y el cambio de tokens', csp == [], str(csp[:4]))
                badge = pa.evaluate("(()=>{const e=document.querySelector('.grecaptcha-badge');if(!e)return null;const s=getComputedStyle(e);return[s.visibility,s.position,!!e.querySelector('iframe')]})()")
                check('el sello de reCAPTCHA no se ve ni ocupa sitio en la página', badge == ['hidden', 'fixed', True], str(badge))
                pa.evaluate("A.openSettings()")
                pa.evaluate("A.openLegal(0,{dataset:{v:'privacy'}})")
                # (el texto se carga al abrirlo: se espera a que esté. Si falla, dice si la configuración sigue puesta, si el texto
                # está en la página aunque no se lea, y cómo acaba)
                wait(pa, "!!document.querySelector('#lgl .legal-text h2')", 15000)
                # (y a que se vea: mientras la página entra, su texto aún no cuenta como visible)
                for _ in range(60):
                    if pa.evaluate("(e => !!e && e.innerText.includes('reCAPTCHA Enterprise'))(document.querySelector('#sh'))"):
                        break
                    pa.wait_for_timeout(100)
                seen = pa.inner_text('#sh')
                check('y Privacidad lo cuenta', 'reCAPTCHA Enterprise' in seen,
                      repr([pa.evaluate('appCheckOn()'), 'reCAPTCHA Enterprise' in pa.evaluate("document.querySelector('#sh').textContent"), len(seen), seen[-160:]]))
                pa.evaluate("sheet()")
                check('(hasta aquí, App Check no ha anotado ningún fallo)', noted(pa) == [], str(noted(pa)))

                # sin conexión no hay token, y no es un fallo que anotar
                fb.set_offline(ca, True)
                pa.reload()
                wait(pa, 'window.__ffok')
                sync(pa)
                check('sin conexión, la app abre igual y App Check no anota nada', pa.evaluate('S.logs.length') >= 0 and noted(pa) == [] and not pa.evaluate(BROKE), str([noted(pa), pa.evaluate(BROKE)]))
                fb.set_offline(ca, False)

                # reCAPTCHA bloqueado (un bloqueador de contenido, una red que lo corta): la app sigue, sin token
                script = re.compile(r'^https://www\.google\.com/recaptcha/enterprise\.js')
                ca.route(script, lambda r: r.abort())
                pa.reload()
                wait(pa, 'window.__ffok')
                del sent[:]
                st = [sync(pa), sync(pa)]
                check('con reCAPTCHA bloqueado, la app sincroniza igual, sin token', st == ['ok', 'ok'] and len(sent) > 2 and all(h is None for h in sent), str([st, sent[:4]]))
                # (la V1.0.3 se publicó tomando por fallo de arranque cualquier script que no cargara: la app seguía debajo,
                # sincronizando, y encima salía «StrataFit no ha podido iniciarse»)
                check('y no lo toma por un fallo de arranque: la pantalla de error no sale', not pa.evaluate(BROKE) and pa.evaluate("!document.querySelector('script[src*=\"recaptcha/enterprise.js\"]')"), str(pa.evaluate(BROKE)))
                check('y lo anota en Diagnóstico una sola vez, no en cada petición', noted(pa) == ['reCAPTCHA no cargó'], str(noted(pa)))
                ca.unroute(script)

                # reCAPTCHA no responde: la primera petición lo espera unos segundos y sale sin token; las demás ya no esperan
                held = []
                ca.route(script, lambda r: held.append(r))
                pa.reload()
                wait(pa, 'window.__ffok')
                del sent[:]
                t0 = time.time()
                st = sync(pa)
                first = time.time() - t0
                t0 = time.time()
                st2 = sync(pa)
                second = time.time() - t0
                check('si reCAPTCHA no responde, la sincronización lo espera unos segundos y sigue sin token', st == 'ok' and first < 14 and len(sent) > 0 and all(h is None for h in sent), '%s en %.1f s · %s' % (st, first, sent[:4]))
                check('y las peticiones siguientes ya no esperan', st2 == 'ok' and second < 3, '%s en %.1f s' % (st2, second))
                check('tampoco entonces sale la pantalla de error de arranque', not pa.evaluate(BROKE))
                # (las peticiones que se dejaron sin contestar se cortan antes de cerrar)
                for r in held:
                    try:
                        r.abort()
                    except Exception:
                        pass
                close(ca, pa)

        # ── subidas juntas: lo que se cambia seguido va en una sola subida, como mucho 30 s después del primer cambio sin subir, y
        #    al pasar la app a segundo plano se sube ya (menos escrituras de Firestore). Con el reloj simulado ──
        cj, pj = device()
        login(pj, 'Ana_1', 'contraseña-1')
        pj.wait_for_timeout(3000)
        sync(pj)
        sync(pj)
        # (las subidas de datos: cada una escribe también el índice; la copia de seguridad semanal va aparte)
        commits = []
        pj.on('request', lambda r: commits.append(r.url) if r.method == 'POST' and ':commit' in r.url and '/data/index' in (r.post_data or '') else None)
        pj.clock.install()
        cpath = 'users/%s/data/core' % uid
        pj.evaluate("S.water=Object.assign(S.water||{},{'%s':300});saveState('core')" % today)
        pj.clock.run_for(10000)
        pj.evaluate("(d=>{S.meals[d]=S.meals[d]||{};(S.meals[d][0]=S.meals[d][0]||[]).push(%s);saveState(mealsPart(d))})('%s')" % (json.dumps(pan), today))
        pj.clock.run_for(10000)
        pj.evaluate("S.water['%s']=600;saveState('core')" % today)
        pj.clock.run_for(9000)
        check('tres cambios seguidos (agua, una comida y agua): nada se sube antes de 30 s desde el primero', not commits and pj.evaluate('pendingDocs()') == 2, '%s %s' % (commits, pj.evaluate('pendingDocs()')))
        pj.clock.run_for(1500)
        wait(pj, "syncState().st=='ok' && !pendingDocs()")
        check('y a los 30 s, los tres en una sola subida', len(commits) == 1 and ((fb.part(cpath) or {}).get('wt') or {}).get(today) == 600 and pan in ((fb.part(mpath) or {}).get(today) or {}).get('0', []), '%d %s' % (len(commits), ((fb.part(cpath) or {}).get('wt') or {}).get(today)))
        pj.evaluate("S.water['%s']=750;saveState('core')" % today)
        pj.evaluate("Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        pj.clock.run_for(50)
        wait(pj, "syncState().st=='ok' && !pendingDocs()")
        check('al pasar la app a segundo plano, lo que esperaba se sube ya', len(commits) == 2 and ((fb.part(cpath) or {}).get('wt') or {}).get(today) == 750, str(len(commits)))
        close(cj, pj)
        sync(p1)
        sync(p2)

        # ── espera creciente tras cinco fallos ──
        c3, p3 = device()
        for _ in range(5):
            login(p3, 'Ana_1', 'mal-contraseña', wait_app=False)
            wait(p3, "document.getElementById('lge').textContent.length>0 && !document.querySelector('[data-a=loginSubmit]').textContent.includes('Entrando')")
        check('contraseña incorrecta: aviso sin decir si existe el usuario', 'Usuario o contraseña incorrectos' in p3.inner_text('#lge'))
        check('tras cinco fallos, hay que esperar (botón desactivado con la cuenta atrás)', p3.evaluate("document.querySelector('[data-a=loginSubmit]').disabled && /Espera \\d+ s/.test(document.querySelector('[data-a=loginSubmit]').textContent)"))
        close(c3, p3)

        # ── foto de perfil: primero el consentimiento ──
        jpeg = base64.b64decode(p1.evaluate("(()=>{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.fillStyle='#c33';x.fillRect(0,0,8,8);return c.toDataURL('image/jpeg',.8).split(',')[1]})()"))
        p1.evaluate('S.tab=3;R()')
        p1.click('.profile-head [data-a=photoConsentAsk]')
        check('la foto pide consentimiento antes de subirla', 'Solo la ves tú' in p1.inner_text('#dg'))
        with p1.expect_file_chooser() as fc:
            p1.click('#dg [data-v=photoConsentOk]')
        fc.value.set_files(files=[{'name': 'yo.jpg', 'mimeType': 'image/jpeg', 'buffer': jpeg}])
        wait(p1, "S.profile.img && S.profile.pc > 0", 10000)
        sync(p1)
        av = fb.part('users/%s/private/avatar' % uid) or {}
        check('con consentimiento, la foto se sube a su documento privado', str(av.get('img', '')).startswith('data:image/jpeg') and av.get('pc'))
        check('la foto no va en el núcleo', 'img' not in json.dumps((fb.part('users/%s/data/core' % uid) or {}).get('pf', {})))
        p1.evaluate('A.photoDelete()')
        sync(p1)
        check('«Quitar foto» la borra también de la nube', fb.data('users/%s/private/avatar' % uid) is None)

        # ── cerrar sesión ──
        fb.set_offline(c1, True)
        p1.evaluate("S.weightLog=[{d:'%s',w:80}];saveState()" % today)
        p1.evaluate('A.signOut()')
        wait(p1, "!!document.querySelector('#dg h3')", 30000)
        check('cerrar sesión con cambios sin subir lo avisa', 'sin subir' in p1.inner_text('#dg'))
        p1.evaluate("document.querySelector('#dg [data-v=doNothing]').click()")
        fb.set_offline(c1, False)
        p1.evaluate('A.signOut()')
        wait(p1, "!!document.querySelector('#dg [data-v=signOutConfirmed]')", 30000)
        check('con todo subido, solo confirma', '¿Cerrar sesión?' in p1.inner_text('#dg'))
        with p1.expect_navigation():
            p1.evaluate("document.querySelector('#dg [data-v=signOutConfirmed]').click()")
        wait(p1, 'window.__ffok')
        left = p1.evaluate("Object.keys(localStorage).filter(k=>k=='ff'||k.startsWith('ff:')||k=='ffacct'||k=='ffsync')")
        check('al cerrar sesión se vuelve al inicio y los datos de la cuenta se borran del móvil', p1.evaluate("!!document.getElementById('lgw')") and left == [], str(left))
        check('y siguen en la nube', len(fb.part('users/%s/logs/2026' % uid) or []) == 2 and (fb.part('users/%s/data/core' % uid) or {}).get('wl') == [{'d': today, 'w': 80}])
        # cerrar sesión con un guardado todavía en marcha (V1.0.32): ese guardado ya no deja escrito el núcleo con sus partes
        # borradas. Antes, la siguiente apertura se quedaba en «No se pudieron leer tus datos», sin poder entrar
        login(p1, 'Ana_1', 'contraseña-1')
        with p1.expect_navigation():
            p1.evaluate("S.tab=2;flushState();A.signOutConfirmed()")
        wait(p1, 'window.__ffok')
        p1.wait_for_timeout(300)
        left = p1.evaluate("({core: !!localStorage.getItem('ff'), lost: !!document.querySelector('#dg [data-v=partsRetry]'), login: !!document.getElementById('lgw')})")
        check('cerrar sesión con un guardado en marcha no deja datos a medias en el móvil: sale el inicio de sesión, sin avisos', left == {'core': False, 'lost': False, 'login': True}, str(left))
        login(p1, 'Ana_1', 'contraseña-1')
        check('y se vuelve a entrar con los datos de la cuenta', p1.evaluate('S.logs.length') == 2 and sync(p1) == 'ok', str(p1.evaluate('S.logs.length')))
        p1.evaluate('A.signOut()')
        wait(p1, "!!document.querySelector('#dg [data-v=signOutConfirmed]')", 30000)
        with p1.expect_navigation():
            p1.evaluate("document.querySelector('#dg [data-v=signOutConfirmed]').click()")
        wait(p1, 'window.__ffok')

        # ── el admin: Administración, cuentas y contraseña temporal ──
        c4, p4 = device()
        login(p4, 'VictorAdmin_', 'admin-clave-1', new=True)
        wait(p4, "!!document.getElementById('wlc')", 30000)
        new_account_bio(p4, 'M')
        p4.click('#tour [data-a=tourSkip]')
        check('una cuenta nueva no es admin: sin Administración', p4.evaluate("(S.tab=3,R(),!document.querySelector('[data-a=openAdmin]'))"))
        fb.set_role('VictorAdmin_', 'admin')
        p4.reload()
        wait(p4, 'window.__ffok')
        sync(p4)
        p4.evaluate('S.tab=3;R()')
        check('con el rol de admin (desde GitHub), Perfil enseña Administración', p4.evaluate("!!document.querySelector('[data-a=openAdmin]')"))
        temp = fb.reset_password('Ana_1')
        fb.put('users/uintruso', {'u': {'stringValue': '<img src=x onerror=alert(1)>'}, 'sx': {'stringValue': 'M'}, 'os': {'stringValue': 'ios'}})
        fb.put('users/uviejo', {'u': {'stringValue': 'Viejo_1'}, 'sx': {'stringValue': 'F'}})
        p4.evaluate('A.openAdmin()')
        wait(p4, "document.querySelector('#sh') && !document.querySelector('#sh').innerText.includes('Cargando')", 15000)
        txt = p4.inner_text('#sh')
        check('Administración lista las cuentas', 'Ana_1' in txt and 'VictorAdmin_' in txt, txt[:300])
        os_n = p4.evaluate("[...document.querySelectorAll('#sh .os-counts > div')].map(d=>d.querySelector('small').textContent+':'+d.querySelector('b').textContent)")
        check('y cuántas usan iPhone, Android u otro sistema; las que aún no abrieron la 1.0.1, «sin dato» (T-28)', os_n == ['iPhone:1', 'Android:0', 'Otro:2', 'Sin dato:1'], str(os_n))
        row = p4.evaluate("[...document.querySelectorAll('#sh .account-list .item')].map(r=>r.innerText.replace(/\\s+/g,' ')).find(t=>t.startsWith('Ana_1'))")
        check('con el sistema de cada cuenta en su fila', row and 'Otro' in row, str(row))
        check('un usuario con código se ve como texto (nada se ejecuta)', p4.evaluate("!document.querySelector('#sh img') && document.querySelector('#sh').innerText.includes('<img src=x')"))
        check('la contraseña temporal sale oculta hasta pulsar «Ver»', temp not in txt and 'Ana_1' in txt)
        p4.click('#sh [data-a=adminToggleSection]')
        # (el cambio es inmediato. Falló una vez en Firefox, en GitHub, sin dejar rastro: ahora se le da un momento y, si no
        # sale, se anota lo que enseña la tarjeta)
        try:
            wait(p4, "document.querySelector('#sh .temp-password').textContent != '••••••••••••'", 2000)
        except AssertionError:
            pass
        card = p4.evaluate("(()=>{const k=document.querySelector('#sh .temp-password-card');return k?k.innerText.replace(/\\s+/g,' '):'no hay tarjeta de contraseña temporal'})()")
        check('«Ver» la enseña', temp in p4.inner_text('#sh'), 'la tarjeta: ' + card.replace(temp, '(la contraseña)'))

        # ── entrar con la contraseña temporal (en un móvil nuevo): hay que elegir una nueva ──
        n_logs = p2.evaluate('S.logs.length')
        c5, p5 = device()
        login(p5, 'Ana_1', temp, wait_app=False)
        wait(p5, "document.getElementById('lgw') && document.getElementById('lgw').innerText.toLowerCase().includes('contraseña nueva')", 15000)
        check('al entrar con la temporal, hay que elegir una nueva antes de nada', p5.evaluate("account.mc==1 && document.querySelector('nav').style.display=='none'"))
        p5.fill('#lgp', 'nueva-clave-9'); p5.fill('#lgp2', 'nueva-clave-9')
        p5.click('[data-a=loginCreatePassword]')
        wait(p5, "window.__ffok && !document.getElementById('lgw')", 20000)
        check('con la nueva, entra con sus datos', p5.evaluate('S.logs.length') == n_logs and sync(p5) == 'ok', str(p5.evaluate('S.logs.length')))
        check('y el perfil ya no pide cambiarla', (fb.data('users/' + uid) or {}).get('mc') is False)
        close(c5, p5)
        # ── la sesión abierta en el móvil 2 caduca: se vuelve a entrar sin perder lo del móvil (con el emulador, si caduca: el
        #    emulador no siempre invalida los tokens como Firebase) ──
        p2.reload()
        wait(p2, 'window.__ffok')
        st = sync(p2)
        if not EMU:
            check('tras cambiar la contraseña, la sesión del otro móvil caduca y lo avisa', st == 'dead' and p2.evaluate("!!document.querySelector('#dg [data-v=reloginShow]')"), st)
        if st == 'dead':
            wait(p2, "!!document.querySelector('#dg [data-v=reloginShow]')")
            p2.evaluate("document.querySelector('#dg [data-v=reloginShow]').click()")
            # cinco contraseñas mal: la misma espera que en el inicio de sesión
            for k in range(5):
                p2.fill('#lrp', 'mal-clave-%d' % k)
                p2.click('[data-a=reloginSubmit]')
                wait(p2, "/incorrect/.test(document.getElementById('lre').textContent)", 15000)
                p2.evaluate("document.getElementById('lre').textContent=''")
            p2.fill('#lrp', 'nueva-clave-9')
            p2.click('[data-a=reloginSubmit]')
            p2.wait_for_timeout(300)
            check('volver a entrar: tras cinco intentos fallidos, hay que esperar', 'Espera' in p2.inner_text('#lre'), p2.inner_text('#lre'))
            p2.evaluate("localStorage.removeItem('fflgn')")
            p2.click('[data-a=reloginSubmit]')
            wait(p2, "!document.querySelector('#sh #lrp')", 15000)
            check('al volver a entrar, sigue con sus datos y sincroniza', p2.evaluate('S.logs.length') == n_logs and sync(p2) == 'ok')
        p4.evaluate("document.querySelector('#sh [data-a=adminDeleteAsk]').click()")
        p4.evaluate("document.querySelector('#dg [data-v=adminDelete]').click()")
        p4.wait_for_timeout(800)
        check('«Entregada» la borra de Administración', temp not in p4.inner_text('#sh'))

        # ── el dominio de las cuentas (V1.0.32): se registran con el del proyecto de Firebase. Una de antes, con el dominio
        #    anterior, entra igual; cuando se pasa (tools/admin/dominio.mjs), su sesión sigue abierta y el móvil no nota nada. Si
        #    las sesiones no se pudieran conservar, vuelve a entrar una vez y no pierde nada ──
        c6, p6 = device()
        login(p6, 'Dora_7', 'clave-dora-7', new=True)
        wait(p6, "!!document.getElementById('wlc')", 30000)
        new_account_bio(p6, 'F')
        p6.click('#tour [data-a=tourSkip]')
        p6.evaluate("S.logs.push({d:'%s',n:'Espalda',v:3600,s:14,m:50,q:7});saveState()" % today)
        sync(p6)
        dora = fb.uid_of('Dora_7')
        check('otra cuenta nueva, con un entreno en la nube', fb.domain_of('Dora_7') == DOMAIN and len(fb.part('users/%s/logs/2026' % dora) or []) == 1)
        # (como estaban todas las cuentas al publicarse la V1.0.32)
        fb.to_old_domain('Dora_7')
        p6.evaluate('A.signOut()')
        wait(p6, "!!document.querySelector('#dg [data-v=signOutConfirmed]')", 30000)
        with p6.expect_navigation():
            p6.evaluate("document.querySelector('#dg [data-v=signOutConfirmed]').click()")
        wait(p6, 'window.__ffok')
        tries = len([c for c in fb.calls if c == ('auth', 'signInWithPassword')]) if not EMU else 0
        login(p6, 'Dora_7', 'clave-dora-7')
        check('una cuenta que sigue con el dominio anterior entra igual, con su usuario y su contraseña', p6.evaluate('account.uid') == dora and fb.domain_of('Dora_7') == OLD_DOMAIN, str(p6.evaluate('account.uid')))
        check('y baja sus datos y sincroniza', p6.evaluate('S.logs.length') == 1 and sync(p6) == 'ok', str(p6.evaluate('S.logs.length')))
        if not EMU:
            check('la app prueba primero el dominio de ahora y después el anterior', len([c for c in fb.calls if c == ('auth', 'signInWithPassword')]) - tries == 2)
        if EMU:
            # (con los scripts de verdad de tools/admin, contra el emulador)
            check('«Asignar rol» y «Restablecer contraseña» encuentran una cuenta que sigue con el dominio anterior', fb.tool_finds('Dora_7'))
            dry = fb.dry_run()
            check('el simulacro va bien, dice que queda una por pasar y que las sesiones se conservan, y no la pasa', dry == (True, 1, True) and fb.domain_of('Dora_7') == OLD_DOMAIN, str(dry))
        # un entreno hecho antes de que la cuenta se pase, sin subir todavía
        p6.evaluate("stopSync();S.logs.push({d:'2026-11-05',n:'Pierna',v:5200,s:18,m:60,q:8});saveState();flushState()")
        moved = fb.move_accounts()
        check('pasar las cuentas mueve la que quedaba al dominio de ahora, con su mismo identificador', moved == 1 and fb.domain_of('Dora_7') == DOMAIN and fb.uid_of('Dora_7') == dora, '%s %s' % (moved, fb.domain_of('Dora_7')))
        check('y no toca las que ya estaban en él', fb.uid_of('Ana_1') == uid and fb.domain_of('VictorAdmin_') == DOMAIN)
        p6.reload()
        wait(p6, 'window.__ffok')
        st = sync(p6)
        check('la sesión del móvil sigue abierta: ni aviso ni contraseña, y lo que no se había subido llega a la nube',
              st == 'ok' and p6.evaluate("!document.querySelector('#dg [data-v=reloginShow]') && !account.x") and p6.evaluate('account.uid') == dora and p6.evaluate('S.logs.length') == 2
              and len(fb.part('users/%s/logs/2026' % dora) or []) == 2, '%s %s' % (st, p6.evaluate('S.logs.length')))
        check('y sigue sincronizando después, ya con el dominio de ahora', sync(p6) == 'ok' and fb.domain_of('Dora_7') == DOMAIN)
        # si las sesiones no se pudieran conservar («aplicar-todo»): el móvil vuelve a entrar una vez, con la contraseña de siempre
        fb.to_old_domain('Dora_7')
        p6.evaluate("stopSync();S.logs.push({d:'2026-11-06',n:'Hombro',v:2800,s:12,m:45,q:7});saveState();flushState()")
        moved = fb.move_accounts(keep=False)
        p6.reload()
        wait(p6, 'window.__ffok')
        st = sync(p6)
        if not EMU:
            check('sin poder conservarlas, la sesión de su móvil caduca y la app lo avisa', moved == 1 and st == 'dead' and p6.evaluate("!!document.querySelector('#dg [data-v=reloginShow]')"), '%s %s' % (moved, st))
        if st == 'dead':
            wait(p6, "!!document.querySelector('#dg [data-v=reloginShow]')")
            check('con lo hecho todavía en el móvil', p6.evaluate('S.logs.length') == 3, str(p6.evaluate('S.logs.length')))
            p6.evaluate("document.querySelector('#dg [data-v=reloginShow]').click()")
            p6.fill('#lrp', 'clave-dora-7')
            p6.click('[data-a=reloginSubmit]')
            wait(p6, "!document.querySelector('#sh #lrp')", 15000)
        check('se vuelve a entrar con la contraseña de siempre y lo que no se había subido llega a la nube',
              p6.evaluate('account.uid') == dora and p6.evaluate('S.logs.length') == 3 and sync(p6) == 'ok' and len(fb.part('users/%s/logs/2026' % dora) or []) == 3 and fb.domain_of('Dora_7') == DOMAIN,
              '%s %s' % (p6.evaluate('S.logs.length'), len(fb.part('users/%s/logs/2026' % dora) or [])))
        p6.evaluate('S.tab=3;R();A.openSettings()')
        check('el correo técnico no aparece en la app, ni con el dominio de ahora ni con el anterior', '@' + DOMAIN not in p6.content() and '@' + OLD_DOMAIN not in p6.content() and 'firebaseapp' not in p6.inner_text('body'))
        close(c6, p6)

        # ── fallos y sugerencias (M5, F-27): los envía el usuario; el admin los ve, los marca y los contesta ──
        sync(p2)
        p2.evaluate("A.openReport();document.querySelector('[data-a=reportChooseKind][data-v=f]').click()")
        p2.evaluate("A.reportChooseArea(2);document.getElementById('rpx').value='La gráfica de peso no se ve <b>bien</b> en modo claro';A.reportSend()")
        wait(p2, "S.reports && S.reports[0] && S.reports[0].s==1", 15000)
        rid = p2.evaluate('S.reports[0].id')
        rdoc = fb.data('reports/' + rid) or {}
        check('el aviso llega a la nube: pendiente, con el usuario y el id de la cuenta', rdoc.get('st') == 'p' and rdoc.get('u') == 'Ana_1' and rdoc.get('uid') == uid and rid.startswith(uid + '-') and rdoc.get('k') == 'f' and rdoc.get('a') == 'Algo se ve mal', str(rdoc))
        check('con los datos técnicos (versión y navegador; nada personal)', ('StrataFit ' + p2.evaluate('APPV')) in (rdoc.get('dx') or '') and 'Navegador' in (rdoc.get('dx') or '') and '@' + DOMAIN not in json.dumps(rdoc) and '@' + OLD_DOMAIN not in json.dumps(rdoc))
        fb.set_offline(c2, True)
        p2.evaluate("A.openReport();document.querySelector('[data-a=reportChooseKind][data-v=s]').click()")
        p2.evaluate("document.getElementById('rpx').value='Poder exportar el análisis también en Excel';A.reportSend()")
        wait(p2, "S.reports.length==2", 10000)
        check('sin conexión, la sugerencia queda en el móvil para enviarla después', p2.evaluate('S.reports[0].s') == 0 and 'sin enviar' in p2.evaluate("(S.tab=3,sheet(),R(),document.querySelector('[data-a=openMyReports]').innerText)"))
        fb.set_offline(c2, False)
        sync(p2)
        wait(p2, "S.reports[0].s==1", 15000)
        sid = p2.evaluate('S.reports[0].id')
        check('al volver la red se envía sola, una vez', (fb.data('reports/' + sid) or {}).get('k') == 's' and sync(p2) == 'ok')
        p4.evaluate('A.openAdmin()')
        txt = p4.inner_text('#sh')
        check('al abrir Administración otra vez se ve lo ya cargado mientras se actualiza, sin la pantalla de «Cargando…» (I-20)', 'Cargando' not in txt and 'Ana_1' in txt and p4.evaluate("!document.querySelector('#sh .temp-password')||!/[A-Za-z0-9]/.test(document.querySelector('#sh .temp-password').textContent)"), txt[:200])
        wait(p4, "(document.querySelector('#sh [data-a=openReports]')||{innerText:''}).innerText.includes('2 pendientes')", 15000)
        check('Administración dice cuántos hay pendientes', '2 pendientes' in p4.inner_text('#sh [data-a=openReports]'), p4.inner_text('#sh')[:200])
        p4.evaluate('A.openReports()')
        wait(p4, "!!document.querySelector('#sh .admin-report-filter')", 15000)
        check('el admin ve los dos, con su usuario y el tipo', p4.evaluate("document.querySelectorAll('#sh .admin-report').length") == 2 and 'Sugerencia de mejora' in p4.inner_text('#sh') and 'Ana_1' in p4.inner_text('#sh'))
        check('el texto con código se ve como texto', p4.evaluate("!document.querySelector('#sh .report-text b') && document.querySelector('#sh').innerText.includes('<b>bien</b>')"))
        p4.evaluate("document.querySelector('#sh [data-a=reportsToggle][data-v=\"%s\"]').click()" % rid)
        wait(p4, "!document.querySelector('#sh [data-a=reportsSetState][disabled]')", 15000)
        check('al abrir uno pendiente pasa a «vista»', (fb.data('reports/' + rid) or {}).get('st') == 'v')
        p2.evaluate('refreshReports(1)')
        wait(p2, "S.reports.find(x=>x.id==%s).st=='v'" % json.dumps(rid), 15000)
        check('y el usuario lo ve como «Vista»', 'Vista' in p2.evaluate("(A.openMyReports(),document.querySelector('#rpl').innerText)"))
        p2.evaluate('sheet()')
        p4.fill('#adrt', 'Gracias: queda arreglado en la próxima versión.')
        p4.evaluate("document.querySelector('#sh [data-a=reportsReply]').click()")
        wait(p4, "!document.querySelector('#sh [data-a=reportsReply][disabled]') && (document.querySelector('#sh [data-a=reportsReply]')||{}).textContent=='Cambiar la respuesta'", 15000)
        p4.evaluate("document.querySelector('#sh [data-a=reportsSetState][data-v=\"%s:a\"]').click()" % rid)
        wait(p4, "!document.querySelector('#sh [data-a=reportsSetState][disabled]') && document.querySelector('#sh [data-a=reportsSetState][data-v$=\":a\"]').classList.contains('on')", 15000)
        rdoc = fb.data('reports/' + rid) or {}
        check('el admin contesta y lo marca como arreglado', rdoc.get('st') == 'a' and rdoc.get('rp', '').startswith('Gracias') and rdoc.get('ra'), str(rdoc))
        p2.evaluate('refreshReports(1)')
        wait(p2, "!!S.reports.find(x=>x.id==%s).rp" % json.dumps(rid), 15000)
        check('el usuario ve en Perfil que tiene una respuesta nueva', '1 respuesta nueva' in p2.evaluate("(S.tab=3,R(),document.querySelector('[data-a=openMyReports]').innerText)"))
        p2.evaluate('A.openMyReports()')
        txt = p2.inner_text('#rpl')
        check('y en su lista: «Contestada», con la respuesta', 'Contestada' in txt and 'queda arreglado' in txt, txt[:300])
        check('al verla deja de ser nueva', p2.evaluate("(sheet(),R(),document.querySelector('[data-a=openMyReports]').innerText)").find('respuesta nueva') < 0)
        close(c4, p4)

        # ── copia de seguridad en la nube (M5, F-30): una sola, que se sustituye ──
        # con datos y sin copia, la primera ya se hizo sola tras sincronizar
        wait(p2, "!!S.cloudBackup", 20000)
        check('la primera copia se hace sola al sincronizar', (fb.data('users/%s/backup/meta' % uid) or {}).get('n', 0) >= 1)
        cb0 = p2.evaluate('S.cloudBackup.at')
        p2.evaluate('sheet();A.openBackup()')
        p2.evaluate("document.querySelector('#sh [data-a=cloudBackupSave]').click()")
        wait(p2, "S.cloudBackup.at>%d" % cb0, 20000)
        meta = fb.data('users/%s/backup/meta' % uid) or {}
        check('«Guardar ahora» sube la copia: meta y trozos', meta.get('n', 0) >= 1 and fb.data('users/%s/backup/c0' % uid) is not None and meta.get('lg') == p2.evaluate('S.logs.length'), str({k: v for k, v in meta.items() if k != 'h'}))
        check('comprimida (gzip) y con su huella', meta.get('z') is True and len(meta.get('h', '')) > 4)
        p2.evaluate("A.cloudBackupRestore()")
        wait(p2, "!!document.querySelector('#dg [data-v=backupRestoreConfirmed]')", 15000)
        check('restaurar la copia de la nube pide confirmar, con su fecha y lo que tiene', 'Restaurar esta copia' in p2.inner_text('#dg') and 'entreno' in p2.inner_text('#dg'))
        p2.evaluate("document.querySelector('#dg [data-v=doNothing]').click()")
        at0 = meta.get('at', 0)
        p2.evaluate("S.cloudBackup.at=Date.now()-8*864e5;saveState()")
        p2.reload()
        wait(p2, 'window.__ffok')
        sync(p2)
        wait(p2, "S.cloudBackup && Date.now()-S.cloudBackup.at<6e4", 20000)
        check('pasada una semana, la copia se hace sola tras sincronizar (y sustituye a la anterior)', (fb.data('users/%s/backup/meta' % uid) or {}).get('at', 0) > at0)
        big = {'at': {'integerValue': '1790000000000'}, 'v': {'stringValue': '1.0.0'}, 'n': {'integerValue': '1'}, 'z': {'booleanValue': False}, 'sz': {'integerValue': '2'}, 'h': {'stringValue': 'x'}, 'lg': {'integerValue': '40'}, 'md': {'integerValue': '30'}}
        fb.put('users/%s/backup/meta' % uid, big)
        p2.evaluate("S.cloudBackup.at=Date.now()-8*864e5;saveState()")
        p2.reload()
        wait(p2, 'window.__ffok')
        sync(p2)
        wait(p2, "!!document.querySelector('#dg h3')", 20000)
        check('pero no sustituye sola una copia con muchos más entrenos: lo avisa', 'más datos' in p2.inner_text('#dg') and (fb.data('users/%s/backup/meta' % uid) or {}).get('lg') == 40)
        p2.evaluate("document.querySelector('#dg [data-v=doNothing]').click()")
        p2.evaluate("A.openBackup();document.querySelector('#sh [data-a=cloudBackupSave]').click()")
        wait(p2, "!!document.querySelector('#dg [data-v=cloudBackupSaveConfirmed]')", 15000)
        check('y a mano, pregunta antes de sustituirla', 'Sustituir' in p2.inner_text('#dg'))
        p2.evaluate("document.querySelector('#dg [data-v=cloudBackupSaveConfirmed]').click()")
        for _ in range(150):
            if (fb.data('users/%s/backup/meta' % uid) or {}).get('lg') != 40:
                break
            p2.wait_for_timeout(100)
        check('al confirmar, la sustituye', (fb.data('users/%s/backup/meta' % uid) or {}).get('lg') == p2.evaluate('S.logs.length'))
        p2.evaluate('sheet()')

        # ── borrar todos los datos: también en la nube ──
        fb.set_offline(c2, True)
        p2.evaluate('A.resetAllConfirmed()')
        p2.wait_for_timeout(500)
        check('sin conexión no se borra nada (si no, volverían de la nube)', p2.evaluate('S.logs.length') == 2 and fb.data('users/%s/data/index' % uid) is not None)
        fb.set_offline(c2, False)
        p2.evaluate("localStorage.setItem('ffw',JSON.stringify({W:{x:[]},t:Date.now()}))")
        p2.evaluate("takeSnapshot()")
        snaps = p2.evaluate("snapList().then(a => a.length)")
        with p2.expect_navigation(timeout=20000):
            p2.evaluate('A.resetAllConfirmed()')
        wait(p2, 'window.__ffok')
        check('con conexión se borran del móvil (también el entreno en curso) y de la nube; el usuario se queda', p2.evaluate("S.logs.length==0 && !localStorage.getItem('ffw')") and fb.data('users/%s/data/index' % uid) is None and fb.data('users/%s/logs/2026' % uid) is None and (fb.data('users/' + uid) or {}).get('u') == 'Ana_1')
        check('y también la copia de seguridad de la nube', fb.data('users/%s/backup/meta' % uid) is None and fb.data('users/%s/backup/c0' % uid) is None)
        check('y las copias automáticas de este móvil: lo borrado no se recupera desde aquí', snaps >= 1 and p2.evaluate("snapList().then(a => a.length)") == 0, str(snaps))
        prof = fb.data('users/' + uid) or {}
        check('del perfil se borra el sexo; se quedan el usuario, las preferencias y lo aceptado', prof.get('sx') == '' and prof.get('u') == 'Ana_1' and 'theme' in (prof.get('pr') or {}) and (prof.get('cs') or {}).get('h', {}).get('st') == 1, str(prof))
        sync(p2)
        check('y la cuenta sigue sincronizando, vacía', p2.evaluate('syncState().st') == 'ok' and fb.data('users/%s/data/index' % uid) is not None)
        check('sin que nada lo devuelva: ni el sexo ni los entrenos', p2.evaluate("S.logs.length == 0 && !(S.biometrics || {}).sex") and (fb.data('users/' + uid) or {}).get('sx') == '')
        p2.evaluate('stopSync()')

        # ══ V1.0.4: lo aceptado, el consentimiento y la eliminación de la cuenta ══
        # una cuenta nueva, con datos, en dos móviles
        c5, p5 = device()
        login(p5, 'Leo_9', 'clave-leo-99', new=True)
        leo = fb.uid_of('Leo_9')
        wait(p5, "!!document.getElementById('wlc')", 30000)
        new_account_bio(p5, 'M')
        p5.click('#tour [data-a=tourSkip]')
        DATA = "S.logs.push({d:'%s',n:'Pierna',v:5000,s:18,m:60,q:7});S.meals['%s']={0:[%s]};S.weightLog=[{d:'%s',w:78}];S.profile={img:'data:image/jpeg;base64,/9j/4AAQSkZJRg==',pc:Date.now()};saveState()" % (today, today, json.dumps(pollo), today)
        p5.evaluate(DATA)
        check('(la cuenta nueva sube sus datos)', sync(p5) == 'ok' and len(fb.part('users/%s/logs/2026' % leo) or []) == 1)
        c6, p6 = device()
        login(p6, 'Leo_9', 'clave-leo-99')
        check('otro móvil de la cuenta entra sin que se le pida nada: ya lo tiene aceptado', p6.evaluate('S.logs.length') == 1 and p6.evaluate('account.cs.h.st') == 1 and p6.evaluate("!document.getElementById('lgw')"))

        # ── una cuenta de antes de la V1.0.4 no tiene nada aceptado: en lugar de la app, la pantalla que lo pide ──
        STRIP = "(a => { delete a.cs; delete a.csu; localStorage.setItem('ffacct', JSON.stringify(a)); })(JSON.parse(localStorage.getItem('ffacct')))"
        GATE = "window.__ffok && !!document.getElementById('lgc1') && document.querySelector('nav').style.display == 'none'"
        APP = "window.__ffok && !document.getElementById('lgw') && document.querySelector('nav').style.display != 'none'"
        fb.strip_consent(leo)
        for pg in (p5, p6):
            pg.evaluate('stopSync()')
            pg.evaluate(STRIP)
            pg.reload()
            wait(pg, GATE)
        p5.wait_for_timeout(2500)
        idx0 = fb.data('users/%s/data/index' % leo)
        p5.evaluate("S.weightLog.push({d:'2026-11-05',w:77});saveState()")
        st = sync(p5)
        check('sin lo aceptado, la app no se abre ni sincroniza: los datos del móvil siguen en él y los de la nube no cambian',
              st == 'idle' and p5.evaluate('S.logs.length') == 1 and fb.data('users/%s/data/index' % leo) == idx0 and (fb.part('users/%s/data/core' % leo) or {}).get('wl') == [{'d': today, 'w': 78}], st)
        check('la pantalla dice de qué cuenta es y deja exportar, borrar, eliminar la cuenta o cerrar sesión', 'Leo_9' in p5.inner_text('#lgw .login-card')
              and p5.evaluate("['gateExport','resetAllAsk','openDeleteAccount','signOut'].every(a => !!document.querySelector('#lgw .login-links [data-a=' + a + ']'))"))
        with p5.expect_download(timeout=20000) as dl:
            p5.click('#lgw [data-a=gateExport]')
        copy = json.load(open(dl.value.path(), encoding='utf-8'))
        check('«Exportar una copia» da el archivo con los datos del móvil, sin aceptar nada', len(copy.get('logs', [])) == 1 and copy.get('_sf', {}).get('app') == 'StrataFit', str(sorted(copy))[:200])
        p5.click('[data-a=consentAccept]')
        check('sin marcar las casillas no se entra', '16 años' in p5.inner_text('#lge') and p5.evaluate('!account.cs'), p5.inner_text('#lge'))
        tick(p5)
        with p5.expect_navigation(timeout=30000):
            p5.click('[data-a=consentAccept]')
        wait(p5, APP)
        st = sync(p5)
        cs = (fb.data('users/' + leo) or {}).get('cs') or {}
        check('al aceptar se entra, con los datos que había, y lo aceptado se anota en el perfil de la cuenta', st == 'ok' and p5.evaluate('S.logs.length') == 1 and cs.get('t', {}).get('v') == '1.0'
              and cs.get('h', {}).get('st') == 1 and abs(cs['h'].get('at', 0) - time.time() * 1000) < 300000 and (fb.part('users/%s/data/core' % leo) or {}).get('wl', [{}])[-1].get('w') == 77, '%s %s' % (st, cs))
        p6.reload()
        wait(p6, APP, 30000)
        check('el otro móvil, al abrirse, ve que la cuenta ya aceptó y entra sin pedirlo otra vez', p6.evaluate('account.cs.h.st') == 1 and sync(p6) == 'ok' and p6.evaluate('S.weightLog.length') == 2)

        # los textos cambiarán de versión: lo aceptado en otro dispositivo con una app más nueva (una versión posterior) vale
        # también en esta, que ni lo pide otra vez ni lo pisa; una versión que ya no vale sí se pide de nuevo
        fb.set_terms(leo, '9.0', int(time.time() * 1000))
        p6.reload()
        wait(p6, APP, 30000)
        st = sync(p6)
        seen = ((fb.data('users/' + leo) or {}).get('cs') or {}).get('t', {})
        check('unas condiciones posteriores, aceptadas con una app más nueva, valen aquí: no se piden otra vez ni se pisan en el perfil',
              st == 'ok' and p6.evaluate('account.cs.t.v') == '9.0' and seen.get('v') == '9.0' and p6.evaluate(APP), '%s %s' % (st, seen))
        fb.set_terms(leo, '0.9', int(time.time() * 1000))
        p6.reload()
        wait(p6, GATE, 30000)
        check('unas que ya no valen se piden de nuevo, sin tocar los datos del móvil ni borrar nada',
              p6.evaluate('S.weightLog.length') == 2 and 'acepta las condiciones' in p6.inner_text('#lgw .login-card') and p6.evaluate("!!document.querySelector('#lgw [data-a=gateExport]')"), p6.inner_text('#lgw .login-card')[:120])
        tick(p6)
        with p6.expect_navigation(timeout=30000):
            p6.click('[data-a=consentAccept]')
        wait(p6, APP, 30000)
        st = sync(p6)
        seen = ((fb.data('users/' + leo) or {}).get('cs') or {}).get('t', {})
        check('y al aceptarlas queda anotada la versión de ahora, con los datos donde estaban', st == 'ok' and seen.get('v') == '1.0' and p6.evaluate('S.weightLog.length') == 2, '%s %s' % (st, seen))

        # ── un móvil que acaba de entrar en una cuenta sin lo aceptado no ha bajado nada: «Exportar una copia» baja de la nube
        # lo de la cuenta solo para el archivo; y si la app se cierra en esa pantalla, al aceptar después baja lo de la cuenta
        # sin que lo de partida del móvil pise nada ──
        for pg in (p5, p6):
            pg.evaluate('stopSync()')
        fb.strip_consent(leo)
        core0 = fb.part('users/%s/data/core' % leo) or {}
        cloud0 = [fb.tree(leo), core0, fb.part('users/%s/logs/2026' % leo)]
        c7, p7 = device()
        login(p7, 'Leo_9', 'clave-leo-99', wait_app=False)
        wait(p7, GATE, 30000)
        empty = "S.logs.length == 0 && !(S.weightLog || []).length && !Object.keys(S.meals || {}).length && !(S.biometrics || {}).sex"
        check('un móvil que entra en la cuenta sin lo aceptado ve la pantalla que lo pide, sin haber bajado nada', p7.evaluate(empty))

        def export(pg, why):
            with pg.expect_download(timeout=20000) as dl:
                pg.click('#lgw [data-a=gateExport]')
            copy = json.load(open(dl.value.path(), encoding='utf-8'))
            check(why, copy.get('_sf', {}).get('app') == 'StrataFit' and len(copy.get('logs', [])) == 1 and copy.get('wl') == core0.get('wl') and len(copy.get('wl') or []) == 2
                  and today in (copy.get('meals') or {}) and (copy.get('bio') or {}).get('sex') == 'M', str({k: copy.get(k) for k in ('logs', 'wl', 'bio')})[:300])
            # (que tampoco se ha guardado lo dice la pantalla al abrirse de nuevo, abajo)
            check('y lo bajado no se queda en el móvil ni cambia nada en la nube', pg.evaluate(empty)
                  and [fb.tree(leo), fb.part('users/%s/data/core' % leo) or {}, fb.part('users/%s/logs/2026' % leo)] == cloud0)

        export(p7, '«Exportar una copia» baja de la nube lo de la cuenta para el archivo: entrenos, comidas, peso y el sexo del perfil')
        p7.reload()
        wait(p7, GATE, 30000)
        check('si la app se cierra en esa pantalla, al abrirla sigue en ella y sin nada de la cuenta', p7.evaluate(empty))
        export(p7, 'y la copia, también entonces, es la de la cuenta (no lo vacío del móvil)')
        tick(p7)
        with p7.expect_navigation(timeout=30000):
            p7.click('[data-a=consentAccept]')
        wait(p7, APP, 30000)
        st = sync(p7)
        core1 = fb.part('users/%s/data/core' % leo) or {}
        check('al aceptar, el móvil baja lo de la cuenta y lo de partida no pisa nada en la nube',
              st == 'ok' and p7.evaluate('S.logs.length') == 1 and p7.evaluate('S.weightLog.length') == 2 and p7.evaluate("S.biometrics.sex") == 'M'
              and core1.get('wl') == core0.get('wl') and core1.get('bio') == core0.get('bio') and fb.part('users/%s/logs/2026' % leo) == cloud0[2], '%s %s' % (st, {k: core1.get(k) for k in ('wl', 'bio')}))
        c7.close()
        for pg in (p5, p6):
            pg.reload()
            wait(pg, APP, 30000)

        # ── el contacto de privacidad: un aviso del tipo «Privacidad y datos» ──
        p5.evaluate("A.openPrivacyContact()")
        check('se abre ya con su tipo y sin datos técnicos marcados', p5.evaluate("document.querySelector('#rpp [data-a=reportChooseKind][data-v=p]').classList.contains('on') && !document.getElementById('rpd').checked"))
        p5.evaluate("document.getElementById('rpx').value='Quiero saber qué datos míos guardáis';A.reportSend()")
        wait(p5, "S.reports && S.reports[0] && S.reports[0].s==1", 15000)
        pid = p5.evaluate('S.reports[0].id')
        rdoc = fb.data('reports/' + pid) or {}
        check('y llega como tal, sin datos técnicos', rdoc.get('k') == 'p' and rdoc.get('dx') == '' and rdoc.get('uid') == leo and rdoc.get('u') == 'Leo_9', str(rdoc))
        p5.evaluate('sheet()')

        # ── retirar el consentimiento: se borran los registros (de la nube y del móvil) y la cuenta queda a la espera ──
        wait(p5, "!!S.cloudBackup", 30000)
        sync(p5)
        before = fb.tree(leo)
        check('(antes: registros, foto y copia en la nube)', all(('users/%s/' % leo) + x in before for x in ('data/core', 'data/index', 'logs/2026', 'meals/2026-11', 'private/avatar', 'backup/meta')), str(before))
        p5.evaluate("S.tab=3;R();A.openSettings();A.openLegal(0,{dataset:{v:'privacy'}})")
        p5.click('#lgl [data-a=consentWithdrawAsk]')
        check('antes de retirar se dice qué se borra', 'se borrarán' in p5.inner_text('#dg') and 'Tu usuario se mantiene' in p5.inner_text('#dg'))
        fb.set_offline(c5, True)
        p5.evaluate("document.querySelector('#dg [data-v=consentWithdraw]').click()")
        wait(p5, "document.getElementById('tt').textContent.includes('Sin conexión')", 30000)
        check('sin conexión no se retira ni se borra nada', p5.evaluate('account.cs.h.st === 1 && S.logs.length == 1') and fb.tree(leo) == before)
        fb.set_offline(c5, False)
        with p5.expect_navigation(timeout=30000):
            p5.evaluate('A.consentWithdraw()')
        wait(p5, GATE)
        left = fb.tree(leo)
        prof = fb.data('users/' + leo) or {}
        cs = prof.get('cs') or {}
        check('con conexión: fuera de la nube los registros, la foto y la copia; quedan el perfil y el aviso enviado', left == sorted(['users/' + leo, 'reports/' + pid]), str(left))
        check('en el perfil queda anotada la retirada, con su momento y el de cuando se dio; las condiciones siguen aceptadas',
              cs.get('h', {}).get('st') == 0 and cs['h'].get('ga', 0) > 0 and cs['h'].get('at', 0) >= cs['h']['ga'] and cs.get('t', {}).get('v') == '1.0' and prof.get('sx') == '' and prof.get('u') == 'Leo_9', str(prof))
        check('en el móvil no queda ningún registro ni copia, y la app pide el consentimiento de nuevo',
              p5.evaluate("S.logs.length == 0 && !(S.weightLog || []).length && !S.profile.img") and p5.evaluate("snapList().then(a => a.length)") == 0 and 'Has retirado tu consentimiento' in p5.inner_text('#lgw .login-card')
              and p5.evaluate("!document.querySelector('#lgw [data-a=gateExport]') && !!document.querySelector('#lgw [data-a=openDeleteAccount]')"))
        # el otro móvil seguía con sus registros: al sincronizar ve la retirada, los borra también y se abre de nuevo
        had = p6.evaluate('S.logs.length + (S.weightLog || []).length')
        with p6.expect_navigation(timeout=30000):
            try:
                p6.evaluate('syncNow()')
            except Exception:
                pass  # la app se abre de nuevo mientras se espera la respuesta
        wait(p6, GATE, 30000)
        check('el otro móvil se entera al sincronizar: borra también lo que le quedaba, pide el consentimiento y no devuelve nada a la nube',
              had > 0 and p6.evaluate("S.logs.length == 0 && !(S.weightLog || []).length && !S.profile.img") and p6.evaluate("snapList().then(a => a.length)") == 0
              and 'Has retirado tu consentimiento' in p6.inner_text('#lgw .login-card') and p6.evaluate('syncState().st') == 'idle' and fb.tree(leo) == left,
              '%s %s %s' % (had, p6.evaluate('[S.logs.length, (S.weightLog || []).length, syncState().st]'), fb.tree(leo)))
        tick(p5)
        with p5.expect_navigation(timeout=30000):
            p5.click('[data-a=consentAccept]')
        wait(p5, APP)
        st = sync(p5)
        cs2 = (fb.data('users/' + leo) or {}).get('cs') or {}
        check('al darlo de nuevo se vuelve a entrar, con la cuenta vacía', st == 'ok' and p5.evaluate('S.logs.length') == 0 and cs2.get('h', {}).get('st') == 1 and cs2['h'].get('at', 0) >= cs['h']['at'] and 'ga' not in cs2['h'], '%s %s' % (st, cs2))
        p6.reload()
        wait(p6, APP, 30000)
        sync(p6)
        check('y el otro móvil entra y se queda igual: lo que tenía de antes de la retirada no vuelve', p6.evaluate('S.logs.length == 0 && !(S.weightLog || []).length') and fb.data('users/%s/logs/2026' % leo) is None, str(p6.evaluate('[S.logs.length, (S.weightLog || []).length]')))

        # ── «Eliminar cuenta» ──
        p5.evaluate(DATA)
        sync(p5)
        p5.evaluate("A.openBackup();document.querySelector('#sh [data-a=cloudBackupSave]').click()")
        wait(p5, "!!S.cloudBackup", 30000)
        p5.evaluate('sheet()')
        sync(p5)
        full = fb.tree(leo)
        check('(antes: la cuenta con registros, foto, copia y un aviso)', len(full) >= 8 and 'reports/' + pid in full, str(full))
        p5.evaluate("S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'cuenta'}})")
        p5.click('#ajs [data-a=openDeleteAccount]')
        check('Ajustes → Cuenta → «Eliminar cuenta»: dice qué se borra y pide la contraseña', 'Se borrarán para siempre' in p5.inner_text('#dlc') and p5.evaluate("document.getElementById('dlp').type") == 'password')

        def delete_account(pw):
            """Escribe la contraseña y confirma; devuelve lo que acaba diciendo la página (o '' si la app se abre de nuevo)."""
            p5.fill('#dlp', pw)
            p5.click('#dlc [data-a=deleteAccountAsk]')
            p5.evaluate("document.querySelector('#dg [data-v=deleteAccountConfirmed]').click()")
            wait(p5, "!document.getElementById('dle') || /\\.$/.test(document.getElementById('dle').textContent)", 40000)
            return p5.evaluate("(document.getElementById('dle') || {}).textContent || ''")

        said = delete_account('otra-clave-00')
        check('con una contraseña que no es no se borra nada', said == 'La contraseña no es correcta.' and fb.tree(leo) == full and fb.has_account('Leo_9'), said)
        if not EMU:
            fb.fail_delete.add('users/%s/data/core' % leo)
            said = delete_account('clave-leo-99')
            check('si los datos no se pueden borrar, la cuenta no se elimina y se dice', 'No se han podido borrar todos tus datos' in said and fb.has_account('Leo_9') and 'users/' + leo in fb.tree(leo), said)
            fb.fail_delete.clear()
            fb.no_delete = True
            said = delete_account('clave-leo-99')
            check('si el servidor no deja eliminar cuentas: los datos se borran, la cuenta sigue y se dice cómo pedirlo', 'el servidor no deja eliminar la cuenta' in said and fb.tree(leo) == [] and fb.has_account('Leo_9'), said)
            fb.no_delete = False
        p5.fill('#dlp', 'clave-leo-99')
        p5.click('#dlc [data-a=deleteAccountAsk]')
        check('antes de eliminar, confirma', '¿Eliminar la cuenta?' in p5.inner_text('#dg') and 'No se puede deshacer' in p5.inner_text('#dg'))
        with p5.expect_navigation(timeout=40000):
            p5.evaluate("document.querySelector('#dg [data-v=deleteAccountConfirmed]').click()")
        wait(p5, "window.__ffok && !!document.getElementById('lgu')")
        wait(p5, "!!document.querySelector('#dg h3')", 10000)
        check('al eliminarla, la app se abre sin sesión y lo dice', 'Cuenta eliminada' in p5.inner_text('#dg') and p5.evaluate("!account"))
        p5.evaluate("document.querySelector('#dg [data-v=doNothing]').click()")
        left = p5.evaluate("Object.keys(localStorage).filter(k => /^ff(:|$|acct|sync|own|w|pre|bad|gone)/.test(k))")
        check('en el móvil no queda nada de la cuenta', left == [] and p5.evaluate("snapList().then(a => a.length)") == 0, str(left))
        check('en la nube no queda nada suyo: ni registros, ni foto, ni copia, ni perfil, ni avisos', fb.tree(leo) == [], str(fb.tree(leo)))
        check('y la cuenta ya no existe', not fb.has_account('Leo_9'))
        login(p5, 'Leo_9', 'clave-leo-99', wait_app=False)
        wait(p5, "document.getElementById('lge').textContent.length > 5", 30000)
        check('con ese usuario y esa contraseña ya no se entra', 'incorrectos' in p5.inner_text('#lge'), p5.inner_text('#lge'))
        p5.reload()
        wait(p5, 'window.__ffok')
        check('el aviso de la cuenta eliminada sale una sola vez', p5.evaluate("!document.querySelector('#dg').firstChild && !localStorage.getItem('ffgone')"))
        # el otro móvil, que seguía con la sesión abierta
        p6.evaluate("S.weightLog=(S.weightLog||[]).concat([{d:'2026-11-06',w:76}]);saveState()")
        st = sync(p6)
        check('en otro móvil que seguía abierto: deja de sincronizar, no devuelve nada a la nube y dice que la cuenta ya no existe',
              st == 'dead' and fb.tree(leo) == [] and 'Esta cuenta ya no existe' in p6.inner_text('#dg') and p6.evaluate("account.x") == 2, '%s %s %s' % (st, fb.tree(leo), p6.inner_text('#dg')[:80]))
        with p6.expect_navigation(timeout=30000):
            p6.evaluate("document.querySelector('#dg [data-v=signOutConfirmed]').click()")
        wait(p6, "window.__ffok && !!document.getElementById('lgu')")
        left = p6.evaluate("Object.keys(localStorage).filter(k => /^ff(:|$|acct|sync|own|w|pre|bad)/.test(k))")
        check('y con «Cerrar sesión» se borra también lo que quedaba en él', left == [], str(left))
        if EMU:
            # la limpieza periódica de verdad (tools/admin/limpieza.mjs). Restos: datos y un aviso de una cuenta que ya no existe
            # (como los que deja un móvil que sube algo justo después de eliminarse su cuenta) y una contraseña temporal caducada
            fb.put('users/fantasma/data/core', {'j': {'stringValue': '{}'}, 'm': {'integerValue': '1'}, 'r': {'stringValue': 'r1'}, 'v': {'integerValue': '1'}, 'd': {'stringValue': 'movil'}})
            fb.put('reports/fantasma-1', {'uid': {'stringValue': 'fantasma'}, 'u': {'stringValue': 'Leo_9'}, 'k': {'stringValue': 'f'}, 't': {'stringValue': 'un aviso de prueba'}, 'st': {'stringValue': 'p'}})
            fb.put('adminInbox/caducada', {'u': {'stringValue': 'Leo_9'}, 'p': {'stringValue': 'x'}, 't': {'integerValue': '1'}, 'exp': {'integerValue': '2'}})
            rest = fb.tree('fantasma')
            # (los dos perfiles sueltos de la prueba de Administración tampoco son de ninguna cuenta: son restos, como los que
            # deja una cuenta borrada desde la consola)
            loose = ['users/uintruso', 'users/uviejo']
            code, out = fb.sweep('simulacro')
            check('la limpieza, en simulacro: cuenta lo que borraría sin borrarlo y sin nombrar a nadie',
                  code == 0 and len(rest) == 2 and bool(re.search(r'Datos de cuentas que ya no existen \| 3\b', out)) and bool(re.search(r'Contraseñas temporales caducadas \| [1-9]', out))
                  and fb.tree('fantasma') == rest and all(fb.data(x) is not None for x in loose) and fb.data('adminInbox/caducada') is not None
                  and 'Leo_9' not in out and 'Ana_1' not in out and 'fantasma' not in out and 'uviejo' not in out and '@' not in out, out[-600:])
            code, out = fb.sweep('aplicar')
            check('al aplicarla: fuera los restos de las cuentas que ya no existen y la contraseña temporal caducada; las cuentas con actividad, intactas',
                  code == 0 and fb.tree('fantasma') == [] and all(fb.data(x) is None for x in loose) and fb.data('adminInbox/caducada') is None and fb.has_account('Ana_1') and fb.data('users/' + uid) is not None
                  and bool(re.search(r'Cuentas eliminadas ahora \| 0', out)) and bool(re.search(r'Restos borrados ahora \| 3', out)), out[-600:])
            admin_uid = fb.uid_of('VictorAdmin_')
            code, out = fb.sweep('simulacro', days=735)
            idle = re.search(r'Sin actividad desde hace 2 años \| (\d+)', out)
            check('pasados dos años sin que nadie entre, el simulacro las cuenta todas menos la del administrador', code == 0 and idle and int(idle.group(1)) >= 1 and bool(re.search(r'De administrador sin actividad \(no se eliminan\) \| 1', out)) and fb.has_account('Ana_1'), out[-600:])
            code, out = fb.sweep('aplicar', days=735)
            check('y al aplicarla se eliminan con todos sus datos; la del administrador, no',
                  code == 0 and not fb.has_account('Ana_1') and fb.tree(uid) == [] and fb.has_account('VictorAdmin_') and fb.data('users/' + admin_uid) is not None
                  and bool(re.search(r'Cuentas eliminadas ahora \| %s\b' % idle.group(1), out)), out[-600:])

        csp = [x for pg in (p1, p2) for x in (pg.evaluate('window.__csp||[]') or [])]
        check('sin choques con la política de seguridad (CSP)', not csp, str(csp[:3]))
        check('sin errores de JS', not errs, '\n'.join(errs[:8]))
        b.close()
    print('\n%d correctas, %d fallos' % (len(passes), len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'stratafit.html'))
