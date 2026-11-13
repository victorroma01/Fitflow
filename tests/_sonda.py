"""SONDA TEMPORAL (se quita en el siguiente cambio): qué hace que, en WebKit, el texto elegido de un select cuente como
contenido que se sale y ensanche la página. Mide la pantalla del entreno, «Mi nutrición» y Perfil a 320 px, tal cual y con
variantes de CSS puestas de una en una.   SF_BROWSER=webkit python3 tests/_sonda.py dist/stratafit.html"""
import os, sys, json, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts, ENGINE
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shots import SCR  # noqa: E402


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


SET = "(css => { if (!window.__ps) { window.__ps = new CSSStyleSheet(); document.adoptedStyleSheets = [...document.adoptedStyleSheets, window.__ps]; } window.__ps.replaceSync(css); return 0; })"
MEASURE = """(q => { const top = document.querySelector('#sh > .sp:not(.spu)') || document.querySelector('#app');
  const sel = [...document.querySelectorAll(q)].filter(s => s.getBoundingClientRect().width > 0).slice(0, 5).map(s => { const r = s.getBoundingClientRect(), cs = getComputedStyle(s), o = s.options[s.selectedIndex];
    return '[' + Math.round(r.left) + ',' + Math.round(r.right) + '] ' + s.scrollWidth + '/' + s.clientWidth + ' ' + cs.overflowX + ' ' + cs.fontSize + ' ' + cs.fontWeight + ' ' + (cs.appearance || cs.webkitAppearance) + ' «' + (o ? o.textContent : '') + '»'; });
  return { doc: document.documentElement.scrollWidth, top: top.scrollWidth + '/' + top.clientWidth, sel }; })"""
OFF = '.psel{overflow-x:visible!important}'
CASES = {
    'go': ('.psel select', [('tal cual (con el arreglo)', ''), ('sin el arreglo', OFF), ('+ padding 10', OFF + '.psel select{padding:10px!important}'),
                            ('+ borde 1px', OFF + '.psel select{border:1px solid transparent!important}'), ('+ min-height 0', OFF + '.xs select{min-height:0!important}'),
                            ('+ peso 400', OFF + '.psel select{font-weight:400!important}'), ('+ alto 100%', OFF + '.xtl .psel select{height:100%!important;top:0!important;bottom:0!important}'),
                            ('+ opacity 1', OFF + '.psel select{opacity:1!important}'), ('+ select overflow hidden', OFF + '.psel select{overflow:hidden!important}'),
                            ('+ select contain paint', OFF + '.psel select{contain:paint!important}'), ('+ chip inline-flex', OFF + '.chip.ic{display:inline-flex!important}'),
                            ('+ select estático', OFF + '.psel select{position:static!important}'), ('+ appearance none', OFF + '.psel select{-webkit-appearance:none!important;appearance:none!important}')]),
    'nutri_my': ('.mnw select', [('tal cual', ''), ('padding 0', '.mnw select{padding:0!important}'), ('borde 0', '.mnw select{border:0!important}'), ('padding y borde 0', '.mnw select{padding:0!important;border:0!important}'),
                                 ('peso 600', '.mnw select{font-weight:600!important}'), ('min-height 44', '.mnw select{min-height:44px!important}'), ('alto auto', '.mnw select{height:auto!important;top:-2px!important;bottom:-2px!important}')]),
    'perfil_open': ('details[open] select', [('tal cual', ''), ('padding 0', 'details select{padding:0!important}'), ('borde 0', 'details select{border:0!important}'), ('padding y borde 0', 'details select{padding:0!important;border:0!important}')]),
}
path = sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html'
with sync_playwright() as p:
    b = launch(p)
    c = b.new_context(viewport={'width': 320, 'height': 568}, has_touch=True, is_mobile=ENGINE == 'chromium', color_scheme='dark', **context_opts(path))
    c.add_init_script(rd('init.js'))
    pg = c.new_page()
    pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
    pg.goto(app_url(path))
    pg.clock.run_for(800)
    pg.evaluate(rd('seed.js'))
    pg.evaluate(rd('extra.js'))
    pg.evaluate("S.reduceMotion=1;saveState()")
    pg.reload()
    pg.wait_for_load_state('load')
    pg.clock.run_for(800)
    print('SONDA', ENGINE, '· pointer:coarse', pg.evaluate("matchMedia('(pointer:coarse)').matches"), '· letra', pg.evaluate("getComputedStyle(document.body).fontFamily"))
    for k, (q, variants) in CASES.items():
        pg.evaluate("document.querySelector('#dg').innerHTML='';sheet();if(W){W=null};S.planBackup=null;overviewMode=0;weightView=0;localStorage.removeItem('ffw')")
        pg.evaluate(SCR[k])
        pg.clock.run_for(400)
        pg.wait_for_timeout(150)
        for name, css in variants:
            pg.evaluate(SET, css)
            pg.wait_for_timeout(60)
            r = pg.evaluate(MEASURE, q)
            print('SONDA %-12s %-28s página %s · ventana %s' % (k, name, r['doc'], r['top']))
            if name.startswith('tal cual') or name == 'sin el arreglo':
                for s in r['sel']:
                    print('SONDA      ', s)
        pg.evaluate(SET, '')
    b.close()
