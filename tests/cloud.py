"""Prueba de la cuenta y la nube (M2 y M5): inicio de sesión y registro, sincronización entre dos móviles (también sin conexión y
con cambios en los dos), cerrar sesión, espera tras fallos, Administración, contraseña temporal, fallos y sugerencias (enviar,
sin conexión, vista, respuesta y arreglado), copia de seguridad en la nube (a mano, semanal, sin pisar una copia con más datos,
restaurar), foto con consentimiento, borrar todos los datos y seguridad (sin código inyectado ni choques con la CSP).

  python3 tests/cloud.py dist/stratafit.html                          (Firebase de prueba en memoria: tests/fakefb.py)
  SF_CLOUD=emulador python3 tests/cloud.py dist/emu/stratafit.html    (emulador de Firebase, con firestore.rules; en la CI)
Con el emulador, la contraseña temporal la crea el script de verdad (tools/admin/contrasena.mjs, con firebase-admin).
"""
import os, re, sys, json, base64, subprocess, urllib.request
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

    def delete(self, path):
        self._req('%s/v1/projects/%s/databases/(default)/documents/%s' % (self.FS, self.P, path), method='DELETE')

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
                pg.click('[data-a=loginMode][data-v=up]')
            pg.fill('#lgu', user)
            pg.fill('#lgp', pw)
            if new:
                pg.fill('#lgp2', pw)
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
            wait(pg, "!document.getElementById('wlc') && !!document.querySelector('#tour .trst')")

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
        check('el inicio de sesión lleva el logo (F-40)', p1.evaluate("(i=>!!i&&i.alt=='StrataFit'&&i.complete&&i.naturalWidth==288)(document.querySelector('#lgw img.brl'))"))
        check('sin datos personales en el registro: solo usuario y contraseña', p1.evaluate("(A.loginMode(0,{dataset:{v:'up'}}),[...document.querySelectorAll('#lgw input')].map(i=>i.id).join())") == 'lgu,lgp,lgp2')
        p1.fill('#lgu', 'Ana_1'); p1.fill('#lgp', 'contraseña-1'); p1.fill('#lgp2', 'otra-cosa')
        p1.click('[data-a=loginSubmit]')
        check('contraseñas que no coinciden: aviso y no se crea nada', 'no coinciden' in p1.inner_text('#lge'))
        p1.fill('#lgu', 'a..b')
        p1.click('[data-a=loginSubmit]')
        check('usuario no válido: aviso', 'punto' in p1.inner_text('#lge'))
        p1.evaluate("A.loginMode(0,{dataset:{v:'in'}})")
        login(p1, 'Ana_1', 'contraseña-1', new=True)
        uid = fb.uid_of('Ana_1')
        prof = fb.data('users/' + uid) or {}
        check('al crear la cuenta se crea su perfil con el usuario (y nada personal)', prof.get('u') == 'Ana_1' and set(prof) <= {'u', 'sx', 'pr', 'ca', 'm', 'os'}, str(prof))
        check('y se suben el índice y el núcleo', fb.data('users/%s/data/index' % uid) is not None and fb.part('users/%s/data/core' % uid) is not None)
        check('Perfil enseña el usuario', 'Ana_1' in p1.inner_text('#app') or p1.evaluate("(S.tab=3,R(),document.querySelector('.pfn').textContent)") == 'Ana_1')
        check('el correo técnico no aparece en la app', '@stratafit.app' not in p1.content())

        # ── cuenta nueva (I-23, I-24): sin programa y, tras la primera sincronización, la bienvenida con sus datos; después, el
        #    recorrido de la primera vez (F-36). Visto en un móvil, no vuelve a salir en otro ──
        check('la cuenta nueva empieza sin programa: «Seleccionar programa»', p1.evaluate("S.noProgram===1 && S.plan.every(d=>!d.ex.length) && (S.tab=0,R(),!!document.querySelector('#app .npc'))"))
        wait(p1, "!!document.getElementById('wlc')", 30000)
        check('cuenta nueva: tras la primera sincronización sale la bienvenida', 'Gracias por instalar la app' in p1.inner_text('#wlc') and p1.evaluate("!document.getElementById('tour')"))
        new_account_bio(p1, 'F')
        check('con los datos guardados, el recorrido empieza por su primer paso', p1.evaluate("document.querySelector('#tour .trst').textContent") == 'Paso 1 de 5' and p1.evaluate('S.welcomePending') is None)
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

        # ── preferencias: van en el perfil y pasan al otro móvil al abrir la app ──
        p2.evaluate("S.theme='light';S.accent=-1;S.accentColor='#ff2d55';S.reduceMotion=1;saveState()")
        sync(p2)
        pr = (fb.data('users/' + uid) or {}).get('pr', {})
        check('las preferencias van en el perfil (también el color propio y reducir animaciones)', pr.get('theme') == 'light' and pr.get('acc') == -1 and pr.get('acx') == '#ff2d55' and pr.get('rm') == 1, str(pr))
        p1.reload()
        wait(p1, 'window.__ffok')
        sync(p1)
        check('y el otro móvil las aplica', p1.evaluate("S.theme") == 'light' and p1.evaluate("document.documentElement.dataset.theme") == 'light' and p1.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--a2').trim()") == '#ff2d55' and p1.evaluate("document.documentElement.classList.contains('rm')"))

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

        # ── App Check (I-05): sin configurar no hace nada; configurado, cada petición a Firebase lleva su token. reCAPTCHA y el
        #    cambio de tokens, simulados (la CSP de esta compilación, sin App Check, no los admite: el contexto la salta) ──
        if not EMU:
            ca = b.new_context(viewport={'width': 390, 'height': 844}, bypass_csp=True, **context_opts(path))
            ca.add_init_script('window.__sfNoSession=1;window.__sfNet=1;')
            ca.add_init_script(INIT)
            fb.install(ca)
            ca.route(re.compile(r'https://www\.google\.com/recaptcha/enterprise\.js.*'), lambda r: r.fulfill(content_type='application/javascript', body="window.grecaptcha={enterprise:{ready:function(f){f()},execute:function(k,o){window.__rc=[k,o&&o.action];return Promise.resolve('rc-tok')}}};"))
            exch = []
            ca.route(re.compile(r'https://content-firebaseappcheck\.googleapis\.com/.*'), lambda r: (exch.append([r.request.url, r.request.post_data]), r.fulfill(content_type='application/json', body='{"token":"ac-tok","ttl":"3600s"}')))
            pa = ca.new_page()
            sent = []
            pa.on('request', lambda r: sent.append(r.headers.get('x-firebase-appcheck')) if re.match(r'https://(identitytoolkit|securetoken|firestore)\.googleapis\.com/', r.url) else None)
            pa.goto(url)
            wait(pa, 'window.__ffok')
            check('sin configurar, App Check no hace nada: ni carga reCAPTCHA ni lo menciona', not pa.evaluate('appCheckOn()') and not pa.evaluate("!!document.querySelector('script[src*=recaptcha]')") and 'reCAPTCHA' not in pa.inner_text('#lgw'))
            on = "APP_CHECK.siteKey='clave-sitio';APP_CHECK.appId='1:1234:web:abcd';R()"
            pa.evaluate(on)
            check('configurado, el inicio de sesión dice que se usa reCAPTCHA (su sello no se ve)', 'reCAPTCHA' in pa.inner_text('#lgw'))
            del sent[:]
            login(pa, 'Ana_1', 'contraseña-1')
            check('al entrar, la petición a Authentication lleva el token de App Check', sent[:1] == ['ac-tok'], str(sent[:3]))
            check('que sale de reCAPTCHA Enterprise (con su clave) cambiado en App Check', len(exch) >= 1 and (':exchangeRecaptchaEnterpriseToken?key=' in exch[0][0]) and '/projects/' in exch[0][0] and '/apps/1:1234:web:abcd' in exch[0][0] and 'rc-tok' in (exch[0][1] or ''), str(exch[:1]))
            # (entrar recarga la app, y la configuración de esta prueba se pierde: se vuelve a poner)
            pa.evaluate(on)
            del sent[:]
            n = len(exch)
            sync(pa)
            pa.evaluate("window.__rc=null")
            sync(pa)
            check('cada petición de la sincronización lo lleva', len(sent) > 2 and all(h == 'ac-tok' for h in sent), str(sent[:8]))
            check('y el token se pide una sola vez por hora (no en cada petición)', len(exch) == n + 1 and pa.evaluate('window.__rc') is None, str(len(exch) - n))
            pa.evaluate("A.openSettings()")
            pa.evaluate("A.openSettingsPage(0,{dataset:{v:'privacidad'}})")
            check('y Privacidad lo cuenta', 'reCAPTCHA Enterprise' in pa.inner_text('#sh'))
            ca.close()

        # ── espera creciente tras cinco fallos ──
        c3, p3 = device()
        for _ in range(5):
            login(p3, 'Ana_1', 'mal-contraseña', wait_app=False)
            wait(p3, "document.getElementById('lge').textContent.length>0 && !document.querySelector('[data-a=loginSubmit]').textContent.includes('Entrando')")
        check('contraseña incorrecta: aviso sin decir si existe el usuario', 'Usuario o contraseña incorrectos' in p3.inner_text('#lge'))
        check('tras cinco fallos, hay que esperar (botón desactivado con la cuenta atrás)', p3.evaluate("document.querySelector('[data-a=loginSubmit]').disabled && /Espera \\d+ s/.test(document.querySelector('[data-a=loginSubmit]').textContent)"))
        c3.close()

        # ── foto de perfil: primero el consentimiento ──
        jpeg = base64.b64decode(p1.evaluate("(()=>{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.fillStyle='#c33';x.fillRect(0,0,8,8);return c.toDataURL('image/jpeg',.8).split(',')[1]})()"))
        p1.evaluate('S.tab=3;R()')
        p1.click('.pfh [data-a=photoConsentAsk]')
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
        os_n = p4.evaluate("[...document.querySelectorAll('#sh .aos > div')].map(d=>d.querySelector('small').textContent+':'+d.querySelector('b').textContent)")
        check('y cuántas usan iPhone, Android u otro sistema; las que aún no abrieron la 1.0.1, «sin dato» (T-28)', os_n == ['iPhone:1', 'Android:0', 'Otro:2', 'Sin dato:1'], str(os_n))
        row = p4.evaluate("[...document.querySelectorAll('#sh .acl .it')].map(r=>r.innerText.replace(/\\s+/g,' ')).find(t=>t.startsWith('Ana_1'))")
        check('con el sistema de cada cuenta en su fila', row and 'Otro' in row, str(row))
        check('un usuario con código se ve como texto (nada se ejecuta)', p4.evaluate("!document.querySelector('#sh img') && document.querySelector('#sh').innerText.includes('<img src=x')"))
        check('la contraseña temporal sale oculta hasta pulsar «Ver»', temp not in txt and 'Ana_1' in txt)
        p4.click('#sh [data-a=adminToggleSection]')
        check('«Ver» la enseña', temp in p4.inner_text('#sh'))

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
        c5.close()
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

        # ── fallos y sugerencias (M5, F-27): los envía el usuario; el admin los ve, los marca y los contesta ──
        sync(p2)
        p2.evaluate("A.openReport();document.querySelector('[data-a=reportChooseKind][data-v=f]').click()")
        p2.evaluate("A.reportChooseArea(2);document.getElementById('rpx').value='La gráfica de peso no se ve <b>bien</b> en modo claro';A.reportSend()")
        wait(p2, "S.reports && S.reports[0] && S.reports[0].s==1", 15000)
        rid = p2.evaluate('S.reports[0].id')
        rdoc = fb.data('reports/' + rid) or {}
        check('el aviso llega a la nube: pendiente, con el usuario y el id de la cuenta', rdoc.get('st') == 'p' and rdoc.get('u') == 'Ana_1' and rdoc.get('uid') == uid and rid.startswith(uid + '-') and rdoc.get('k') == 'f' and rdoc.get('a') == 'Algo se ve mal', str(rdoc))
        check('con los datos técnicos (versión y navegador; nada personal)', ('StrataFit ' + p2.evaluate('APPV')) in (rdoc.get('dx') or '') and 'Navegador' in (rdoc.get('dx') or '') and '@stratafit.app' not in json.dumps(rdoc))
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
        check('al abrir Administración otra vez se ve lo ya cargado mientras se actualiza, sin la pantalla de «Cargando…» (I-20)', 'Cargando' not in txt and 'Ana_1' in txt and p4.evaluate("!document.querySelector('#sh .adk')||!/[A-Za-z0-9]/.test(document.querySelector('#sh .adk').textContent)"), txt[:200])
        wait(p4, "(document.querySelector('#sh [data-a=openReports]')||{innerText:''}).innerText.includes('2 pendientes')", 15000)
        check('Administración dice cuántos hay pendientes', '2 pendientes' in p4.inner_text('#sh [data-a=openReports]'), p4.inner_text('#sh')[:200])
        p4.evaluate('A.openReports()')
        wait(p4, "!!document.querySelector('#sh .adrf')", 15000)
        check('el admin ve los dos, con su usuario y el tipo', p4.evaluate("document.querySelectorAll('#sh .adr').length") == 2 and 'Sugerencia de mejora' in p4.inner_text('#sh') and 'Ana_1' in p4.inner_text('#sh'))
        check('el texto con código se ve como texto', p4.evaluate("!document.querySelector('#sh .rptx b') && document.querySelector('#sh').innerText.includes('<b>bien</b>')"))
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
        c4.close()

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
        with p2.expect_navigation(timeout=20000):
            p2.evaluate('A.resetAllConfirmed()')
        wait(p2, 'window.__ffok')
        check('con conexión se borran del móvil (también el entreno en curso) y de la nube; el usuario se queda', p2.evaluate("S.logs.length==0 && !localStorage.getItem('ffw')") and fb.data('users/%s/data/index' % uid) is None and fb.data('users/%s/logs/2026' % uid) is None and (fb.data('users/' + uid) or {}).get('u') == 'Ana_1')
        check('y también la copia de seguridad de la nube', fb.data('users/%s/backup/meta' % uid) is None and fb.data('users/%s/backup/c0' % uid) is None)
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
