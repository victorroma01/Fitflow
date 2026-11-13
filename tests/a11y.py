"""Prueba de accesibilidad: abre las 47 pantallas de tests/shots.py y comprueba que
  · cada botón tiene un nombre que se pueda leer (texto, aria-label o title; un símbolo suelto como ☰, ‹ o ✕ no vale),
  · cada campo (input, select, textarea) tiene una etiqueta asociada (aria-label, title, aria-labelledby o <label>),
  · lo que se toca sin ser un botón (un div con data-a) se anuncia como botón (role="button") y se puede enfocar,
  · en el entreno en curso, a 390 y a 320 px de ancho, todo lo que se toca responde en al menos 44 × 44 px (el mínimo
    de Apple): se mide tocando de verdad (elementFromPoint) desde el centro hacia cada lado, así que cuenta la zona
    táctil ampliada aunque el botón se vea más pequeño, y falla si otro control se la quita,
  · en el resto de pantallas, todo lo que se toca responde en al menos 24 × 24 px (el mínimo de WCAG 2.2 AA), medido igual,
    en la ventana que esté encima (la hoja, el aviso, el menú o la pestaña); y se cuenta cuánto llega a 44 px,
  · cada hoja, página, aviso o menú abierto se anuncia como ventana (role="dialog" y aria-modal) con un nombre (I-06),
y, aparte, que el foco va a cada hoja, página, aviso y menú al abrirlos y vuelve a lo que los abrió al cerrarlos, también
cuando tocar un botón no le da el foco (como en Safari).

  python3 tests/a11y.py dist/stratafit.html            (falla si hay algún problema)
  python3 tests/a11y.py dist/stratafit.html --lista    (enseña todos los elementos con problemas; sin ella, los cinco primeros)
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
# fuera del entreno, lo mínimo que tiene que responder cualquier control (WCAG 2.2 AA, 2.5.8)
FLOOR = 24
# las pantallas con la lista de alimentos (unas 500 filas de 35 px de alto cada una): más de la mitad de los controles de la app;
# la parte que llega a 44 px se da también sin ellas
FOOD_LIST = ('nuadd', 'scan')
# los fondos que cierran una hoja o el menú al tocar fuera no son controles: la hoja tiene su propio botón de cerrar
BACKDROPS = '.bk, .mbk, .lvb'
SCAN = """((min, floor) => {
  // (lo de dentro de un desplegable cerrado tiene tamaño pero no se pinta ni se toca: checkVisibility lo sabe)
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility != 'hidden' && s.display != 'none' && (!e.checkVisibility || e.checkVisibility()); };
  const txt = s => (s || '').replace(/\\s+/g, ' ').trim();
  const label = e => txt(e.getAttribute('aria-label')) || txt(e.getAttribute('title')) ||
    (e.getAttribute('aria-labelledby') || '').split(' ').map(i => txt((document.getElementById(i) || {}).textContent)).join(' ').trim();
  const named = s => /[\\p{L}\\p{N}]/u.test(s);
  const desc = e => e.outerHTML.replace(/\\s+/g, ' ').slice(0, 120);
  const out = { botones: [], campos: [], clicables: [], pequeños: [], ventanas: [], diminutos: [], medidos: 0, de44: 0 };
  // hojas, páginas, avisos y menú: ventanas para los lectores de pantalla, con nombre (I-06)
  for (const w of document.querySelectorAll('#sh > .sp:not(.spu), #dg .dgc, #mn .msd, #f2w'))
    if (w.getAttribute('role') != 'dialog' || w.getAttribute('aria-modal') != 'true' || !named(label(w))) out.ventanas.push(desc(w));
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
  if (floor) {
    // en la ventana de encima, cada control (una casilla o un campo dentro de su <label> cuentan con él: tocar la etiqueta
    // los activa): cuánto responde alrededor de su centro
    const top = document.querySelector('#dg .dgc') || document.querySelector('#mn .msd') || document.querySelector('#f2w') || document.querySelector('#sh > .sp:not(.spu)') || document.querySelector('#app');
    const seen = new Set();
    for (let e of top.querySelectorAll('button, input:not([type=hidden]):not([type=file]), select, textarea, [role=button], [data-a], summary, a[href]')) {
      if (!vis(e) || e.disabled || e.matches('""" + BACKDROPS + """') || e.parentElement.closest('button, [role=button], [role=img], a[href]')) continue;
      const lab = e.matches('input, select') && e.closest('label');
      if (lab) e = lab;
      if (seen.has(e)) continue;
      seen.add(e);
      e.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const at = document.elementFromPoint(cx, cy);
      // tapado ahora mismo por una barra fija (se alcanza desplazando): no se mide
      if (!at || !(at == e || e.contains(at))) continue;
      const reach = (dx, dy, lim) => { let k = 0; while (k < lim) { const h = document.elementFromPoint(cx + (k + 1) * dx, cy + (k + 1) * dy); if (!h || !(h == e || e.contains(h))) break; k++; } return k; };
      const w = reach(-1, 0, r.width / 2 + 44) + reach(1, 0, r.width / 2 + 44) + 1, h = reach(0, -1, r.height / 2 + 44) + reach(0, 1, r.height / 2 + 44) + 1;
      out.medidos++;
      if (w >= 43 && h >= 43) out.de44++;
      if (w < floor - 1 || h < floor - 1) out.diminutos.push(Math.round(r.width) + '×' + Math.round(r.height) + ' (toca en ' + w + '×' + h + ') ' + desc(e));
    }
    (top.id == 'app' ? window : top).scrollTo({ top: 0, behavior: 'instant' });
  }
  return out;
})"""


# qué tiene el foco: una descripción corta
ACTIVE = """(() => { const a = document.activeElement; if (!a || a == document.body) return 'nada';
  const w = a.closest('#sh .sp, #dg .dgc, #mn .msd, #f2w'); const d = a.dataset && a.dataset.a ? '[data-a=' + a.dataset.a + ']' : '';
  return (a == w ? 'ventana ' + (w.closest('#sh') ? 'hoja' : w.closest('#dg') ? 'aviso' : w.closest('#mn') ? 'menú' : 'wod') : w ? 'dentro de la ventana ' + d : 'fuera ' + a.tagName.toLowerCase() + d); })()"""
# el nombre de la hoja o página abierta (lo que lee VoiceOver al llegar a ella)
SHEET_NAME = """(() => { const p = document.querySelector('#sh > .sp'); const t = p && document.getElementById(p.getAttribute('aria-labelledby') || '');
  return t ? t.textContent.trim() : ''; })()"""


def focus_checks(b, path):
    """El foco va a cada ventana al abrirla y vuelve a lo que la abrió al cerrarla (I-06)."""
    c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
    c.add_init_script(rd('init.js'))
    pg = c.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
    pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
    pg.goto(app_url(path))
    pg.clock.run_for(800)
    pg.evaluate(rd('seed.js'))
    pg.evaluate(rd('extra.js'))
    pg.reload()
    pg.wait_for_load_state('load')
    pg.clock.run_for(800)
    fails = 0

    def check(name, ok, info=''):
        nonlocal fails
        print(('  ok   ' if ok else '  FALLA'), name, '' if ok else '· ' + str(info)[:160])
        if not ok:
            fails += 1

    def press(sel, real=True):
        # real: un toque de verdad (en Chromium le da el foco al botón); si no, un click() sin foco, como en Safari
        if real:
            pg.click(sel)
        else:
            pg.evaluate("document.querySelector(%r).click()" % sel)
        pg.clock.run_for(400)

    print('\nEl foco en las ventanas (I-06)')
    pg.evaluate("S.tab=0;R()")
    pg.clock.run_for(300)
    press('[data-a=openMenu]')
    check('al abrir el menú, el foco va a él', pg.evaluate(ACTIVE) == 'ventana menú', pg.evaluate(ACTIVE))
    press('#mn [data-v=openPrograms]')
    check('al elegir «Programas», el foco va a su hoja', pg.evaluate(ACTIVE) == 'ventana hoja', pg.evaluate(ACTIVE))
    pg.evaluate("A.closeSheet()")
    check('y al cerrarla vuelve al botón del menú', pg.evaluate(ACTIVE) == 'fuera button[data-a=openMenu]', pg.evaluate(ACTIVE))

    pg.evaluate("S.tab=3;R()")
    pg.clock.run_for(300)
    press('[data-a=openSettings]')
    check('al abrir Ajustes, el foco va a la página y se llama «Ajustes»', pg.evaluate(ACTIVE) == 'ventana hoja' and pg.evaluate(SHEET_NAME) == 'Ajustes', [pg.evaluate(ACTIVE), pg.evaluate(SHEET_NAME)])
    # Ajustes se vuelve a pintar tras cada cambio (R()): la ventana sigue teniendo nombre (lo perdía: su título se quedaba sin id)
    pg.evaluate("R()")
    check('y se sigue llamando «Ajustes» cuando se vuelve a pintar', pg.evaluate(SHEET_NAME) == 'Ajustes', pg.evaluate(SHEET_NAME))
    press('[data-a=openSettingsPage][data-v=tema]')
    check('al pasar a «Tema y estilo», el foco va a la página nueva y se llama así', pg.evaluate(ACTIVE) == 'ventana hoja' and pg.evaluate(SHEET_NAME) == 'Tema y estilo', [pg.evaluate(ACTIVE), pg.evaluate(SHEET_NAME)])
    pg.evaluate("(e => { e.checked = !e.checked; e.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#ajs input[type=checkbox]'))")
    check('y sigue con su nombre al cambiar un ajuste', pg.evaluate(SHEET_NAME) == 'Tema y estilo', pg.evaluate(SHEET_NAME))
    pg.evaluate("(e => { e.checked = !e.checked; e.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#ajs input[type=checkbox]'))")
    press('#sh [data-a=openSettings]')
    check('con «←», de vuelta en «Ajustes», con el foco en ella', pg.evaluate(ACTIVE) == 'ventana hoja' and pg.evaluate(SHEET_NAME) == 'Ajustes', [pg.evaluate(ACTIVE), pg.evaluate(SHEET_NAME)])
    press('[data-a=resetAllAsk]')
    check('«Borrar todos los datos»: el foco va al aviso', pg.evaluate(ACTIVE) == 'ventana aviso', pg.evaluate(ACTIVE))
    press('#dg [data-v=doNothing]')
    check('«Cancelar»: el foco vuelve a «Borrar todos los datos»', pg.evaluate(ACTIVE) == 'dentro de la ventana [data-a=resetAllAsk]', pg.evaluate(ACTIVE))
    press('#sh [aria-label=Volver]')
    check('al cerrar Ajustes, el foco vuelve a la fila «Ajustes» de Perfil', pg.evaluate(ACTIVE) == 'fuera button[data-a=openSettings]', pg.evaluate(ACTIVE))

    # como en Safari: el toque no le da el foco al botón; la hoja sabe igualmente qué la abrió
    pg.evaluate("document.activeElement.blur()")
    press('[data-a=openSettings]', real=False)
    check('sin foco en el botón (Safari): el foco va a la página', pg.evaluate(ACTIVE) == 'ventana hoja', pg.evaluate(ACTIVE))
    press('#sh [aria-label=Volver]', real=False)
    check('y al cerrarla vuelve al botón que la abrió', pg.evaluate(ACTIVE) == 'fuera button[data-a=openSettings]', pg.evaluate(ACTIVE))

    # a un campo de texto no se le devuelve el foco: en el móvil abriría el teclado
    pg.evaluate("S.tab=1;R()")
    pg.clock.run_for(300)
    ok = pg.evaluate("""(() => { const i = document.createElement('input'); i.id = 'fx'; document.querySelector('#app').prepend(i); i.focus();
      sheet('<h3>Prueba</h3><p>Hoja de prueba</p>'); const inside = document.activeElement.matches('#sh .sp'); sheet();
      const back = document.activeElement == i; i.remove(); return [inside, back]; })()""")
    check('abierta desde un campo de texto, el foco va a la hoja y al cerrarla no vuelve al campo', ok == [True, False], ok)
    if errs:
        check('sin errores de JS', False, errs[:3])
    c.close()
    return fails


# espera a que terminen las animaciones de entrada (las que no acaban nunca, como la del icono del ejercicio en curso, no)
SETTLED = "Promise.all((document.getAnimations ? document.getAnimations() : []).filter(a => a.effect && isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => 0))).then(() => 0)"


def main(path, show):
    fails = 0
    total = {}
    with sync_playwright() as p:
        b = launch(p)
        # controles medidos y cuántos responden en 44 × 44; y, de ellos, los de la lista de alimentos
        measured = [0, 0, 0, 0]
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
                    # con la pantalla quieta: mientras una hoja entra deslizándose, lo que se mide se está moviendo (en WebKit,
                    # la zona de un botón salía de 1 px de alto)
                    pg.evaluate(SETTLED)
                    r = pg.evaluate(SCAN + '(%d, %d)' % (MIN if k in WORKOUT else 0, FLOOR))
                    # (se cuentan una vez: las pantallas del entreno se repiten a 320 px)
                    n_all, n_44 = r.pop('medidos'), r.pop('de44')
                    if w == 390:
                        measured[0] += n_all
                        measured[1] += n_44
                        if k in FOOD_LIST:
                            measured[2] += n_all
                            measured[3] += n_44
                    r['bloqueos de la CSP'] = pg.evaluate('window.__csp||[]')
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
                    for kk, v in r.items():
                        for x in (v if show else v[:5]):
                            print('         ', kk, '·', x)
            if errs:
                print('  FALLA errores de JS:', errs[:3])
                fails += 1
            c.close()
        fails += focus_checks(b, path)
        b.close()
    rest = (measured[0] - measured[2], measured[1] - measured[3])
    print('\n  zonas táctiles: %d controles medidos · %d de menos de %d px (WCAG 2.2 AA) · %d (el %d %%) responden en 44 × 44 px o más; sin la lista de alimentos, %d de %d (el %d %%)'
          % (measured[0], total.get('diminutos', 0), FLOOR, measured[1], round(measured[1] * 100 / max(1, measured[0])), rest[1], rest[0], round(rest[1] * 100 / max(1, rest[0]))))
    print('\n  botones sin nombre: %d · campos sin etiqueta: %d · clicables sin rol de botón: %d · zonas táctiles de menos de %d px en el entreno: %d · ventanas sin anunciar: %d'
          % (total.get('botones', 0), total.get('campos', 0), total.get('clicables', 0), MIN, total.get('pequeños', 0), total.get('ventanas', 0)))
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN %d pantallas' % fails))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html', '--lista' in sys.argv)
