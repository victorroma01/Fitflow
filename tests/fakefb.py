"""Firebase de prueba, en memoria, para tests/cloud.py: lo justo de Authentication y Firestore (sus API REST) que usa la app.

Se engancha a un contexto de Playwright con `install(contexto)`: las peticiones a *.googleapis.com las contesta este objeto,
sin red. Dos contextos con el mismo FakeFirebase son dos móviles con la misma nube.
Las reglas de verdad (firestore.rules) se prueban aparte con el emulador (tests/rules.test.mjs); aquí solo se aplica lo
esencial: cada cuenta lo suyo, el admin además los perfiles y adminInbox, y los avisos (reports): cada cuenta crea los suyos
(id con su uid) y los lee; el admin los lista, los cambia y los borra. `set_offline(contexto, True)` corta la red de un
móvil (como sin cobertura).
"""
import json, base64, secrets, time, re
from urllib.parse import urlparse, parse_qs, unquote

PROJECT = 'stratafit-960ec'
DB = 'projects/%s/databases/(default)/documents' % PROJECT


def _b64(o):
    return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')


class FakeFirebase:
    def __init__(self):
        self.users = {}          # email → {uid, pw, claims, valid_after}
        self.refresh = {}        # token de renovación → (uid, emitido)
        self.docs = {}           # ruta → {'fields': {...}, 'updateTime': '...'}
        self.off = set()        # contextos (móviles) sin red
        self.calls = []          # (método, ruta corta) de cada petición, para las comprobaciones
        self._t = 0

    # ── utilidades de prueba ───────────────────────────────────────────────────────────────────────────────────────────
    def install(self, ctx):
        ctx.route(re.compile(r'https://(identitytoolkit|securetoken|firestore)\.googleapis\.com/.*'), lambda r: self._handle(r, ctx))

    def set_offline(self, ctx, on):
        """Sin red en ese móvil (los demás siguen con ella)."""
        (self.off.add if on else self.off.discard)(ctx)

    def uid_of(self, user):
        return self.users[user.lower() + '@stratafit.app']['uid']

    def set_role(self, user, role):
        self.users[user.lower() + '@stratafit.app']['claims'] = {'role': role} if role == 'admin' else {}

    def reset_password(self, user, temp):
        """Lo que hace tools/admin/contrasena.mjs: contraseña temporal, sesiones cerradas, mc y adminInbox."""
        u = self.users[user.lower() + '@stratafit.app']
        u['pw'] = temp
        u['valid_after'] = self._now()
        path = 'users/' + u['uid']
        d = self.docs.get(path)
        f = dict(d['fields']) if d else {'u': {'stringValue': user}}
        f['mc'] = {'booleanValue': True}
        self._put(path, f)
        self._put('adminInbox/' + secrets.token_hex(6), {'u': {'stringValue': user}, 'p': {'stringValue': temp},
                                                          'exp': {'integerValue': str(int(time.time() * 1000) + 864e5)}})

    def data(self, path):
        """Campos de un documento, ya decodificados (None si no existe)."""
        d = self.docs.get(path)
        return None if d is None else {k: _dec(v) for k, v in d['fields'].items()}

    def part(self, path):
        """Contenido (JSON del campo j) de una parte del estado."""
        d = self.data(path)
        return None if d is None else json.loads(d['j'])

    # ── tiempo y documentos ────────────────────────────────────────────────────────────────────────────────────────────
    def _now(self):
        self._t += 1
        return self._t

    def _stamp(self):
        n = self._now()
        return '2026-11-04T10:%02d:%02d.%06dZ' % (n // 3600 % 60, n // 60 % 60, n % 1000000)

    def _put(self, path, fields):
        self.docs[path] = {'fields': fields, 'updateTime': self._stamp()}
        return self.docs[path]['updateTime']

    def _doc(self, path):
        d = self.docs[path]
        return {'name': DB + '/' + path, 'fields': d['fields'], 'createTime': d['updateTime'], 'updateTime': d['updateTime']}

    # ── tokens ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    def _tokens(self, email):
        u = self.users[email]
        it = 'h.' + _b64(dict({'user_id': u['uid'], 'email': email, 'iat': self._now()}, **u['claims'])) + '.s'
        rt = secrets.token_hex(12)
        self.refresh[rt] = (u['uid'], self._now())
        return it, rt

    def _who(self, req):
        h = req.headers.get('authorization', '')
        if not h.startswith('Bearer h.'):
            return None
        try:
            p = json.loads(base64.urlsafe_b64decode(h.split('.')[1] + '==='))
        except Exception:
            return None
        u = next((x for x in self.users.values() if x['uid'] == p.get('user_id')), None)
        if not u or p.get('iat', 0) < u['valid_after']:
            return None
        return p

    # ── peticiones ─────────────────────────────────────────────────────────────────────────────────────────────────────
    def _handle(self, route, ctx=None):
        req = route.request
        if ctx in self.off:
            return route.abort('internetdisconnected')
        url = urlparse(req.url)
        body = {}
        if req.post_data:
            try:
                body = json.loads(req.post_data)
            except ValueError:
                body = {k: v[0] for k, v in parse_qs(req.post_data).items()}
        try:
            if url.netloc == 'firestore.googleapis.com':
                status, out = self._firestore(req, unquote(url.path), parse_qs(url.query), body)
            else:
                status, out = self._auth(url.netloc, url.path, body)
        except _Fail as f:
            status, out = f.status, {'error': {'code': f.status, 'message': f.msg, 'status': f.st}}
        route.fulfill(status=status, content_type='application/json', body=json.dumps(out),
                      headers={'access-control-allow-origin': '*'})

    def _auth(self, host, path, b):
        self.calls.append(('auth', path.split(':')[-1] if ':' in path else path))
        if host == 'securetoken.googleapis.com':
            ent = self.refresh.get(b.get('refresh_token'))
            u = ent and next((x for e, x in self.users.items() if x['uid'] == ent[0]), None)
            if not u or ent[1] < u['valid_after']:
                raise _Fail(400, 'INVALID_REFRESH_TOKEN', 'INVALID_ARGUMENT')
            email = next(e for e, x in self.users.items() if x['uid'] == ent[0])
            it, rt = self._tokens(email)
            return 200, {'id_token': it, 'refresh_token': rt, 'expires_in': '3600', 'user_id': u['uid']}
        op = path.split(':')[-1]
        email = str(b.get('email', '')).lower()
        if op == 'signUp':
            if email in self.users:
                raise _Fail(400, 'EMAIL_EXISTS')
            if len(b.get('password', '')) < 6:
                raise _Fail(400, 'WEAK_PASSWORD : Password should be at least 6 characters')
            self.users[email] = {'uid': 'u' + secrets.token_hex(6), 'pw': b['password'], 'claims': {}, 'valid_after': 0}
        elif op == 'signInWithPassword':
            u = self.users.get(email)
            if not u or u['pw'] != b.get('password'):
                raise _Fail(400, 'INVALID_LOGIN_CREDENTIALS')
        elif op == 'update':
            p = self._who(_Req(b.get('idToken')))
            if not p:
                raise _Fail(400, 'INVALID_ID_TOKEN')
            email = p['email']
            self.users[email]['pw'] = b['password']
            self.users[email]['valid_after'] = self._now()
        else:
            raise _Fail(400, 'OPERATION_NOT_ALLOWED')
        it, rt = self._tokens(email)
        return 200, {'localId': self.users[email]['uid'], 'email': email, 'idToken': it, 'refreshToken': rt, 'expiresIn': '3600'}

    def _can(self, who, path, write):
        if not who:
            return False
        parts = path.split('/')
        admin = who.get('role') == 'admin'
        if parts[0] == 'users' and len(parts) >= 2:
            if parts[1] == who['user_id']:
                return True
            return admin and not write and len(parts) == 2
        if parts[0] == 'users' and len(parts) == 1:
            return admin and not write
        if parts[0] == 'adminInbox':
            return admin
        if parts[0] == 'reports' and len(parts) == 2:
            if admin:
                return True
            d = self.docs.get(path)
            if not write:
                return d is None or _dec(d['fields'].get('uid', {'nullValue': None})) == who['user_id']
            return d is None and parts[1].startswith(who['user_id'] + '-')
        return False

    def _firestore(self, req, path, q, b):
        who = self._who(req)
        if not who:
            raise _Fail(401, 'Request had invalid authentication credentials.', 'UNAUTHENTICATED')
        prefix = '/v1/' + DB
        rest = path[len(prefix):]
        self.calls.append((req.method, rest))
        if rest == ':batchGet':
            out = []
            for name in b.get('documents', []):
                p = name[len(DB) + 1:]
                if not self._can(who, p, False):
                    raise _Fail(403, 'Missing or insufficient permissions.', 'PERMISSION_DENIED')
                out.append({'found': self._doc(p)} if p in self.docs else {'missing': name})
            return 200, out
        if rest == ':commit':
            writes = b.get('writes', [])
            for w in writes:
                p = (w.get('update') or {}).get('name', w.get('delete', ''))[len(DB) + 1:]
                if not self._can(who, p, True):
                    raise _Fail(403, 'Missing or insufficient permissions.', 'PERMISSION_DENIED')
                pre = w.get('currentDocument')
                if pre and 'exists' in pre and pre['exists'] != (p in self.docs):
                    raise (_Fail(409, 'Document already exists', 'ALREADY_EXISTS') if p in self.docs else _Fail(404, 'No document to update', 'NOT_FOUND'))
                if pre and 'updateTime' in pre and (p not in self.docs or self.docs[p]['updateTime'] != pre['updateTime']):
                    raise _Fail(400, 'the stored version does not match the required base version', 'FAILED_PRECONDITION')
            res = []
            for w in writes:
                if 'delete' in w:
                    self.docs.pop(w['delete'][len(DB) + 1:], None)
                    res.append({})
                    continue
                p = w['update']['name'][len(DB) + 1:]
                f = w['update'].get('fields', {})
                if 'updateMask' in w and p in self.docs:
                    f = dict(self.docs[p]['fields'], **{k: f[k] for k in w['updateMask']['fieldPaths'] if k in f})
                res.append({'updateTime': self._put(p, f)})
            return 200, {'writeResults': res, 'commitTime': self._stamp()}
        p = rest.lstrip('/')
        if req.method == 'GET' and p.count('/') % 2 == 0:     # colección
            if p == 'reports' and who.get('role') != 'admin' or not self._can(who, p + '/x' if p != 'users' else 'users', False):
                raise _Fail(403, 'Missing or insufficient permissions.', 'PERMISSION_DENIED')
            docs = [self._doc(k) for k in sorted(self.docs) if k.rsplit('/', 1)[0] == p]
            return 200, ({'documents': docs} if docs else {})
        if not self._can(who, p, req.method != 'GET'):
            raise _Fail(403, 'Missing or insufficient permissions.', 'PERMISSION_DENIED')
        if req.method == 'GET':
            if p not in self.docs:
                raise _Fail(404, 'Document not found', 'NOT_FOUND')
            return 200, self._doc(p)
        if req.method == 'DELETE':
            self.docs.pop(p, None)
            return 200, {}
        raise _Fail(400, 'unsupported', 'INVALID_ARGUMENT')


class _Fail(Exception):
    def __init__(self, status, msg, st=None):
        self.status, self.msg, self.st = status, msg, st or 'INVALID_ARGUMENT'


class _Req:
    def __init__(self, token):
        self.headers = {'authorization': 'Bearer ' + str(token)}


def _dec(v):
    if 'stringValue' in v:
        return v['stringValue']
    if 'integerValue' in v:
        return int(v['integerValue'])
    if 'doubleValue' in v:
        return v['doubleValue']
    if 'booleanValue' in v:
        return v['booleanValue']
    if 'nullValue' in v:
        return None
    if 'mapValue' in v:
        return {k: _dec(x) for k, x in v['mapValue'].get('fields', {}).items()}
    if 'arrayValue' in v:
        return [_dec(x) for x in v['arrayValue'].get('values', [])]
    return None
