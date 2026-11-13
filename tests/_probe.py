"""Sonda temporal (solo para el trabajo de Firefox en GitHub): qué lee innerText en una subpágina de Ajustes y por qué.
Se quita cuando se sepa."""
import os, sys, json, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


LOOK = """(() => {
  const q = s => document.querySelector(s);
  const st = e => { if (!e) return null; const s = getComputedStyle(e); return { d: s.display, v: s.visibility, o: s.opacity, cv: s.contentVisibility, an: s.animationName, tr: s.transform == 'none' ? '' : s.transform.slice(0, 40), us: s.userSelect, pe: s.pointerEvents, r: (r => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)])(e.getBoundingClientRect()) }; };
  const len = e => e ? [e.innerText.length, e.textContent.length] : null;
  const sp = q('#sh > .sp:not(.spu)'), p = q('#sh .srt p') || q('#sh p') || q('#sh h1');
  return { sh: len(q('#sh')), sp: len(sp), first: len(p), firstText: p ? p.innerText.slice(0, 40) : '', body: document.body.innerText.length, shClass: q('#sh').className, pages: document.querySelectorAll('#sh .sp').length,
    styles: { sh: st(q('#sh')), sp: st(sp), p: st(p) }, active: (a => a ? a.tagName + '.' + a.className : '')(document.activeElement), anims: document.getAnimations ? document.getAnimations().length : -1,
    inert: [...document.querySelectorAll('[inert]')].map(e => e.id || e.className), hidden: [...document.querySelectorAll('[hidden]')].length, ua: navigator.userAgent.slice(-30) };
})()"""


def main(path):
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, color_scheme='dark', **context_opts(path))
        c.add_init_script(rd('init.js'))
        pg = c.new_page()
        pg.clock.install(time=datetime.datetime(2026, 11, 12, 10, 0))
        pg.goto(app_url(path))
        pg.clock.run_for(800)
        pg.evaluate(rd('seed.js'))
        pg.clock.run_for(400)

        def look(name):
            print('SONDA', name, json.dumps(pg.evaluate(LOOK), ensure_ascii=False))

        pg.evaluate("S.tab=3;R();A.openSettings()")
        pg.clock.run_for(300)
        look('Ajustes')
        pg.evaluate("A.openSettingsPage(0,{dataset:{v:'legal'}})")
        look('legal, al momento')
        pg.clock.run_for(300)
        look('legal, tras 300 ms de reloj de prueba')
        pg.wait_for_timeout(1200)
        look('legal, tras 1,2 s de verdad')
        pg.evaluate("document.activeElement && document.activeElement.blur()")
        look('legal, sin foco')
        pg.evaluate("document.querySelector('#sh > .sp').removeAttribute('aria-modal')")
        look('legal, sin aria-modal')
        pg.evaluate("document.querySelector('#sh > .sp').removeAttribute('role')")
        look('legal, sin role')
        pg.evaluate("document.querySelector('#sh > .sp').removeAttribute('tabindex')")
        look('legal, sin tabindex')
        pg.evaluate("(p => { p.style.animation = 'none'; p.querySelectorAll('*').forEach(e => e.style.animation = 'none'); })(document.querySelector('#sh > .sp'))")
        look('legal, sin animaciones')
        pg.evaluate("sheet();A.openLibrary()")
        pg.clock.run_for(300)
        look('Librería')
        pg.evaluate("A.exerciseDetail(0)")
        pg.clock.run_for(300)
        look('ficha de ejercicio')
        b.close()


main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'dist', 'stratafit.html'))
