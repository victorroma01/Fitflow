"""Prueba de accesibilidad: abre las 33 pantallas de tests/shots.py y comprueba que
  · cada botón tiene un nombre que se pueda leer (texto, aria-label o title; un símbolo suelto como ☰, ‹ o ✕ no vale),
  · cada campo (input, select, textarea) tiene una etiqueta asociada (aria-label, title, aria-labelledby o <label>),
  · lo que se toca sin ser un botón (un div con data-a) se anuncia como botón (role="button") y se puede enfocar,
  · en el entreno en curso, a 390 y a 320 px de ancho, todo lo que se toca responde en al menos 44 × 44 px (el mínimo
    de Apple): se mide tocando de verdad (elementFromPoint) desde el centro hacia cada lado, así que cuenta la zona
    táctil ampliada aunque el botón se vea más pequeño, y falla si otro control se la quita.

  python3 tests/a11y.py dist/stratafit.html            (falla si hay algún problema)
  python3 tests/a11y.py dist/stratafit.html --lista    (además, enseña cada elemento con problemas)
"""
import os, sys, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shots import SCR  # noqa: E402


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


# pantallas del entreno en curso: ahí se mide además la zona táctil, y también a 320 px de ancho (iPhone SE)
WORKOUT = ('go', 'go_rest', 'go_open')
VIEWS = [(390, 844, list(SCR)), (320, 568, list(WORKOUT))]
MIN = 44
# los fondos que cierran una hoja o el menú al tocar fuera no son controles: la hoja tiene su propio botón de cerrar
BACKDROPS = '.bk, .mbk, .lvb'
SCAN = """(min => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility != 'hidden' && s.display != 'none'; };
  const txt = s => (s || '').replace(/\\s+/g, ' ').trim();
  const label = e => txt(e.getAttribute('aria-label')) || txt(e.getAttribute('title')) ||
    (e.getAttribute('aria-labelledby') || '').split(' ').map(i => txt((document.getElementById(i) || {}).textContent)).join(' ').trim();
  const named = s => /[\\p{L}\\p{N}]/u.test(s);
  const desc = e => e.outerHTML.replace(/\\s+/g, ' ').slice(0, 120);
  const out = { botones: [], campos: [], clicables: [], pequeños: [] };
  for (const b of document.querySelectorAll('button, [role=button]'))
    if (vis(b) && !named(label(b) || txt(b.textContent))) out.botones.push(desc(b));
  for (const f of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    if (!vis(f) || f.type == 'file') continue;
    const l = label(f) || (f.labels && f.labels.length ? 'label' : '');
    if (!named(l)) out.campos.push(desc(f));
  }
  const NATIVE = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|OPTION|SUMMARY)$/;
  for (const e of document.querySelectorAll('[data-a]')) {
    // un duplicado oculto a propósito (aria-hidden) o un punto dentro de un gráfico (role="img") no se anuncia por separado
    if (!vis(e) || NATIVE.test(e.tagName) || e.parentElement.closest('button, [role=button], a, label, [role=img], [aria-hidden=true]') || e.matches('""" + BACKDROPS + """, [aria-hidden=true]')) continue;
    if (e.getAttribute('role') != 'button' || e.tabIndex < 0) out.clicables.push(desc(e));
  }
  if (min) {
    // zona táctil: desde el centro, hacia cada lado, hasta dónde un toque sigue cayendo en el control (elementFromPoint,
    // que cuenta también la zona ampliada con ::after); el alto y el ancho que resultan deben llegar a min px
    const all = [...document.querySelectorAll('#app button, #app input:not([type=hidden]), #app select, #app textarea, #app [role=button], #app [data-a]')]
      .filter(e => vis(e) && !e.parentElement.closest('button, [role=button], [role=img]') && !e.matches('""" + BACKDROPS + """'));
    for (const e of all) {
      e.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const reach = (dx, dy, lim) => { let k = 0; while (k < lim) { const h = document.elementFromPoint(cx + (k + 1) * dx, cy + (k + 1) * dy); if (!h || !(h == e || e.contains(h))) break; k++; } return k; };
      const w = reach(-1, 0, r.width / 2 + min) + reach(1, 0, r.width / 2 + min) + 1, h = reach(0, -1, r.height / 2 + min) + reach(0, 1, r.height / 2 + min) + 1;
      if (w < min - 1 || h < min - 1)
        out.pequeños.push(Math.round(r.width) + '×' + Math.round(r.height) + ' (toca en ' + w + '×' + h + ') ' + desc(e));
    }
    scrollTo({ top: 0, behavior: 'instant' });
  }
  return out;
})"""


def main(path, show):
    fails = 0
    total = {}
    with sync_playwright() as p:
        b = launch(p)
        for w, h, screens in VIEWS:
            c = b.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
            c.add_init_script(rd('init.js'))
            pg = c.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
            pg.on('dialog', lambda d: d.accept())
            pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
            pg.goto(app_url(path))
            pg.clock.run_for(800)
            pg.evaluate(rd('seed.js'))
            pg.evaluate(rd('extra.js'))
            print('\n%d × %d px%s' % (w, h, '' if w == 390 else ' (solo el entreno)'))
            for k in screens:
                try:
                    # cada pantalla desde cero: sin entreno a medias que reanudar ni hojas abiertas de la anterior
                    pg.evaluate("localStorage.removeItem('ffw')")
                    pg.reload()
                    pg.wait_for_load_state('load')
                    pg.clock.run_for(800)
                    pg.evaluate(SCR[k])
                    pg.clock.run_for(400)
                    r = pg.evaluate(SCAN + '(%d)' % (MIN if k in WORKOUT else 0))
                except Exception as e:
                    print('  FALLA', k, 'no se pudo abrir:', str(e)[:100])
                    fails += 1
                    continue
                n = sum(len(v) for v in r.values())
                for kk, v in r.items():
                    total[kk] = total.get(kk, 0) + len(v)
                print(('  ok   ' if not n else '  FALLA'), k, '' if not n else ' · '.join('%d %s' % (len(v), kk) for kk, v in r.items() if v))
                if n:
                    fails += 1
                    if show:
                        for kk, v in r.items():
                            for x in v:
                                print('         ', kk, '·', x)
            if errs:
                print('  FALLA errores de JS:', errs[:3])
                fails += 1
            c.close()
        b.close()
    print('\n  botones sin nombre: %d · campos sin etiqueta: %d · clicables sin rol de botón: %d · zonas táctiles de menos de %d px en el entreno: %d'
          % (total.get('botones', 0), total.get('campos', 0), total.get('clicables', 0), MIN, total.get('pequeños', 0)))
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN %d pantallas' % fails))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html', '--lista' in sys.argv)
